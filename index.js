const ME = require('./package.json');
const JSON5 = require('json5');
const fs = require('fs');
const path = require('path');
const fhelper = require('./handles/file');
const lg = require('./handles/logger');
const Spark = require("./spark");
const PLUGIN_ROOT_DIR = './plugins/nodejs/sparkbridge2';


var PLUGIN_DATA_DIR;

if (typeof mc !== 'undefined'){
    PLUGIN_DATA_DIR = './plugins/sparkbridge2';
}else{
    PLUGIN_DATA_DIR = './testdata/';
}

if (fhelper.exists(PLUGIN_DATA_DIR) == false) fhelper.mkdir(PLUGIN_DATA_DIR);
console.log(fhelper.read(path.join( __dirname,'logo.txt')));

let ROOT_FILE_HELPER = new fhelper.FileObj('base');
ROOT_FILE_HELPER.initFile('config.json', { target: "ws://127.0.0.1:8080", qid: 114514, pwd: '' });
let RAW_CONFIG = ROOT_FILE_HELPER.getFile('config.json');
const CONFIG = JSON5.parse(RAW_CONFIG);

global.spark = new Spark(CONFIG.target, CONFIG.qid, CONFIG.pwd);
const logger = lg.getLogger('sparkbridge2');
logger.info('SparkBridge载入中...VERSION:' + ME.version);
spark.VERSION = ME.VERSION;

if (typeof mc !== 'undefined'){
    spark.onBDS = true;
}else{
    spark.onBDS = false;
}


const PLUGINS_PATH = path.join(__dirname, 'plugins\\');
const plugins_list = fhelper.listdir(PLUGINS_PATH);

function loadPlugin(_name){
    try {
        let pl_obj = require('./plugins/' + _name);
        let pl_info = require('./plugins/' + _name + "/spark.json");
        logger.info(`加载 ${pl_info.name}`);
        logger.info(`${pl_info.name} 加载完成，作者：${pl_info.author}`);
    } catch (err) {
        console.log(err);
        logger.error(`插件 ${_name} 加载失败`);
    }
}

function readPluginDir(){
    // 遍历plugins文件夹，找到list.json，按照list.json的顺序加载插件
    // 记录当前插件列表，如果在旧的中没有就新增

    // 这里获取旧插件list
    const plugins_load_list = JSON.parse(fhelper.read(path.join(__dirname, 'plugins', 'list.json')));

    // 这里遍历 plugins文件夹，读取spark.json
    const current_list = {};
    plugins_list.forEach(epl => {
        const sata = fs.statSync(PLUGINS_PATH + epl);
        if (!sata.isDirectory()) return;
        let i_info = JSON.parse(fhelper.read(path.join(__dirname, 'plugins', epl, 'spark.json')));
        current_list[i_info.name] = epl;
    });

    // 对比当前插件列表和旧列表，有新增的就加到旧插件列表
    for (let i in current_list) {
        //console.log(i);
        if (plugins_load_list.includes(i) == false) {
            // 新增插件
            logger.info('新增插件' + i);
            plugins_load_list.push(i);
        }
    }

    bootUpPlugins(plugins_load_list,current_list);
}

function bootUpPlugins(plugins_load_list,current_list){
    logger.info('开始加载插件');
    try {
        if (spark.debug) console.log(plugins_load_list);
        if (spark.debug) console.log(current_list)
        for (let i2 in plugins_load_list) {
            // ！！！！此处需要优化！！！！
            let pl_name = plugins_load_list[i2];
            if (current_list[pl_name] == undefined) {
                // 压根没有这个插件的文件夹了，直接删了
                let index = plugins_load_list.indexOf(pl_name);
                if (index !== -1) {
                    plugins_load_list.splice(index, 1);
                }
                logger.info('移除不存在的插件' + pl_name);
            } else {
                // const i_path = path.join(__dirname,'plugins',current_list[pl_name]);
                // console.log(i_path);
                loadPlugin(current_list[plugins_load_list[i2]]);
            }
        }
        fhelper.writeTo(path.join(__dirname, 'plugins', 'list.json'), JSON.stringify(plugins_load_list));
    } catch (e) { console.log(e) }
}


if (spark.onBDS) {
    ll.registerPlugin(
    /* name */ "sparkbridge2",
    /* introduction */ "a qq bot system",
    /* version */[2, 0, 1]
    );
    mc.listen('onServerStarted', () => {
        readPluginDir();
    })
}else{
    console.log('\n');
    logger.warn('====本地调试器====');
    logger.warn("您现在处于调试模式！！！");
    logger.warn("MC类将被覆盖");
    logger.warn("数据存储已转移到testdata文件夹")
    logger.warn('====本地调试器====\n');
    readPluginDir();
}

