import fs from 'fs'
import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import iseobj from 'wsemi/src/iseobj.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import isbol from 'wsemi/src/isbol.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import str2b64 from 'wsemi/src/str2b64.mjs'
import ltdtDiffByKey from 'wsemi/src/ltdtDiffByKey.mjs'
import now2str from 'wsemi/src/now2str.mjs'
import evem from 'wsemi/src/evem.mjs'
import pmSeries from 'wsemi/src/pmSeries.mjs'
import delay from 'wsemi/src/delay.mjs'
import waitFun from 'wsemi/src/waitFun.mjs'
import getErrorMessage from 'wsemi/src/getErrorMessage.mjs'
import fsIsFile from 'wsemi/src/fsIsFile.mjs'
import fsIsFolder from 'wsemi/src/fsIsFolder.mjs'
import fsDeleteFile from 'wsemi/src/fsDeleteFile.mjs'
import fsCreateFolder from 'wsemi/src/fsCreateFolder.mjs'
import fsTaskCp from 'wsemi/src/fsTaskCp.mjs'
import fsTreeFolder from 'wsemi/src/fsTreeFolder.mjs'
import WSyslog from 'w-syslog/src/WSyslog.mjs'
import ot from 'dayjs'


/**
 * 基於檔案之數據變更驅動任務建構器
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.keyId='keyId'] 輸入各筆數據之主鍵字串，預設'keyId'
 * @param {String} [opt.fdTagRemove='./_tagRemove'] 輸入暫存標記為刪除數據資料夾字串，預設'./_tagRemove'
 * @param {String} [opt.fdTaskCpActualSrc='./_taskCpActualSrc'] 輸入儲存來源端之完整任務狀態資料夾字串，預設'./_taskCpActualSrc'
 * @param {String} [opt.fdTaskCpSrc='./_taskCpSrc'] 輸入儲存來源端之觸發任務狀態資料夾字串，預設'./_taskCpSrc'
 * @param {String} [opt.fdLog='./_logs'] 輸入儲存log資料夾字串，預設'./_logs'
 * @param {Function} [opt.funGetNew=null] 輸入取得最新數據之hash數據處理函數，回傳資料陣列，為必須，預設null
 * @param {Function} [opt.funGetCurrent=null] 輸入取得既有數據之hash數據處理函數，回傳資料陣列，為必須，預設null
 * @param {Function} [opt.funAdd=null] 輸入當有新資料時，需要連動處理之函數，預設null
 * @param {Function} [opt.funModify=null] 輸入當有資料需更新時，需要連動處理之函數，預設null
 * @param {Function} [opt.funRemove=null] 輸入當有資料需刪除時，需要連動處理之函數，預設null
 * @param {Function} [opt.funAfterStart=null] 輸入偵測程序剛開始啟動時，需要處理之函數，預設null
 * @param {Function} [opt.funBeforeEnd=null] 輸入偵測程序要結束前，需要處理之函數，預設null
 * @param {Number} [opt.timeToleranceRemove=0] 輸入刪除任務之防抖時長，單位ms，預設0，代表不使用
 * @param {String} [opt.eventNameProcCallfunGetNew='proc-callfun-getNew'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-callfun-getNew'
 * @param {String} [opt.eventNameProcCallfunGetCurrent='proc-callfun-getCurrent'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-callfun-getCurrent'
 * @param {String} [opt.eventNameProcAddCallfunAdd='proc-add-callfun-add'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-add-callfun-add'
 * @param {String} [opt.eventNameProcDiffCallfunModify='proc-diff-callfun-modify'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-diff-callfun-modify'
 * @param {String} [opt.eventNameProcRemoveCallfunRemove='proc-remove-callfun-remove'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-remove-callfun-remove'
 * @param {String} [opt.eventNameProcCallfunAfterStart='proc-callfun-afterStart'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-callfun-afterStart'
 * @param {String} [opt.eventNameProcCallfunBeforeEnd='proc-callfun-beforeEnd'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-callfun-beforeEnd'
 * @param {String} [opt.eventNameProcCoreDetect='proc-coreDetect'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-coreDetect'
 * @param {String} [opt.eventNameProcRetakeRemove='proc-retake-remove'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-retake-remove'
 * @param {String} [opt.eventNameProcCoreRetake='proc-coreRetake'] 輸入觸發事件與紀錄log事件名稱字串，預設'proc-coreRetake'
 * @returns {Object} 回傳事件物件，可呼叫函數on監聽change事件，可呼叫函數srlog額外進行事件紀錄
 * @example
 *
 * import w from 'wsemi'
 * import WDataScheduler from './src/WDataScheduler.mjs'
 *
 * //fdTagRemove
 * let fdTagRemove = './_tagRemove'
 * w.fsCleanFolder(fdTagRemove)
 *
 * //fdTaskCpActualSrc
 * let fdTaskCpActualSrc = './_taskCpActualSrc'
 * w.fsCleanFolder(fdTaskCpActualSrc)
 *
 * //fdTaskCpSrc
 * let fdTaskCpSrc = './_taskCpSrc'
 * w.fsCleanFolder(fdTaskCpSrc)
 *
 * //funGetNew
 * let funGetNew = async() => {
 *     let items = [
 *         {
 *             'id': '114115',
 *             'hash': 'abc',
 *         },
 *     ]
 *     return items
 * }
 *
 * //funGetCurrent
 * let funGetCurrent = async() => {
 *     let items = [
 *         {
 *             'id': '114115',
 *             'hash': 'abc',
 *         },
 *         {
 *             'id': '114116',
 *             'hash': 'def',
 *         },
 *     ]
 *     return items
 * }
 *
 * //funRemove
 * let funRemove = async(v) => {
 *     //do somethings
 * }
 *
 * //funAdd
 * let funAdd = async(v) => {
 *     //do somethings
 * }
 *
 * //funModify
 * let funModify = async(v) => {
 *     //do somethings
 * }
 *
 * let opt = {
 *     fdTagRemove,
 *     fdTaskCpActualSrc,
 *     fdTaskCpSrc,
 *     funGetNew,
 *     funGetCurrent,
 *     funRemove,
 *     funAdd,
 *     funModify,
 * }
 * let ev = await WDataScheduler(opt)
 *     .catch((err) => {
 *         console.log(err)
 *     })
 * ev.on('change', (msg) => {
 *     delete msg.type
 *     delete msg.timeRunStart
 *     delete msg.timeRunEnd
 *     delete msg.timeRunSpent
 *     console.log('change', msg)
 * })
 * // change { event: 'start', msg: 'running...' }
 * // change { event: 'proc-callfun-getNew', msg: 'start...' }
 * // change { event: 'proc-callfun-getNew', num: 1, msg: 'done' }
 * // change { event: 'proc-callfun-getCurrent', msg: 'start...' }
 * // change { event: 'proc-callfun-getCurrent', num: 2, msg: 'done' }
 * // change { event: 'compare', msg: 'start...' }
 * // change {
 * //   event: 'compare',
 * //   numRemove: 1,
 * //   numAdd: 0,
 * //   numModify: 0,
 * //   numSame: 1,
 * //   msg: 'done'
 * // }
 * // change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'start...' }
 * // change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'done' }
 * // change { event: 'end', msg: 'done' }
 *
 */
let WDataScheduler = async(opt = {}) => {

    //keyId
    let keyId = get(opt, 'keyId')
    if (!isestr(keyId)) {
        keyId = `id`
    }

    //fdTagRemove, 暫存標記為刪除數據資料夾
    let fdTagRemove = get(opt, 'fdTagRemove')
    if (!isestr(fdTagRemove)) {
        fdTagRemove = './_tagRemove'
    }

    //fdTaskCpActualSrc, 儲存完整任務狀態資料夾
    let fdTaskCpActualSrc = get(opt, 'fdTaskCpActualSrc')
    if (!isestr(fdTaskCpActualSrc)) {
        fdTaskCpActualSrc = './_taskCpActualSrc'
    }
    if (!fsIsFolder(fdTaskCpActualSrc)) {
        fsCreateFolder(fdTaskCpActualSrc)
    }

    //fdTaskCpSrc, 儲存觸發任務狀態資料夾
    let fdTaskCpSrc = get(opt, 'fdTaskCpSrc')
    if (!isestr(fdTaskCpSrc)) {
        fdTaskCpSrc = './_taskCpSrc'
    }
    if (!fsIsFolder(fdTaskCpSrc)) {
        fsCreateFolder(fdTaskCpSrc)
    }

    //fdLog
    let fdLog = get(opt, 'fdLog')
    if (!isestr(fdLog)) {
        fdLog = './_logs'
    }
    if (!fsIsFolder(fdLog)) {
        fsCreateFolder(fdLog)
    }

    //funGetNew
    let funGetNew = get(opt, 'funGetNew')
    if (!isfun(funGetNew)) {
        throw new Error(`invalid funGetNew`)
    }

    //funGetCurrent
    let funGetCurrent = get(opt, 'funGetCurrent')
    if (!isfun(funGetCurrent)) {
        throw new Error(`invalid funGetCurrent`)
    }

    //funAdd
    let funAdd = get(opt, 'funAdd')

    //funModify
    let funModify = get(opt, 'funModify')

    //funRemove
    let funRemove = get(opt, 'funRemove')

    //funAfterStart
    let funAfterStart = get(opt, 'funAfterStart')

    //funBeforeEnd
    let funBeforeEnd = get(opt, 'funBeforeEnd')

    // //timeToleranceAdd
    // let timeToleranceAdd = get(opt, 'timeToleranceAdd')
    // if (!isp0int(timeToleranceAdd)) {
    //     timeToleranceAdd = 60 * 60 * 1000
    // }
    // timeToleranceAdd = cdbl(timeToleranceAdd)

    // //timeToleranceModify
    // let timeToleranceModify = get(opt, 'timeToleranceModify')
    // if (!isp0int(timeToleranceModify)) {
    //     timeToleranceModify = 60 * 60 * 1000
    // }
    // timeToleranceModify = cdbl(timeToleranceModify)

    //timeToleranceRemove
    let timeToleranceRemove = get(opt, 'timeToleranceRemove')
    if (!isp0int(timeToleranceRemove)) {
        timeToleranceRemove = 0
    }
    timeToleranceRemove = cdbl(timeToleranceRemove)

    //延遲偵測是否創建資料夾
    // if (timeToleranceModify >= 0 && !fsIsFolder(fdTagModify)) {
    //     fsCreateFolder(fdTagModify)
    // }
    if (timeToleranceRemove > 0 && !fsIsFolder(fdTagRemove)) {
        fsCreateFolder(fdTagRemove)
    }

    //eventNameProcCallfunGetNew
    let eventNameProcCallfunGetNew = get(opt, 'eventNameProcCallfunGetNew')
    if (!isestr(eventNameProcCallfunGetNew)) {
        eventNameProcCallfunGetNew = 'proc-callfun-getNew'
    }

    //eventNameProcCallfunGetCurrent
    let eventNameProcCallfunGetCurrent = get(opt, 'eventNameProcCallfunGetCurrent')
    if (!isestr(eventNameProcCallfunGetCurrent)) {
        eventNameProcCallfunGetCurrent = 'proc-callfun-getCurrent'
    }

    //eventNameProcAddCallfunAdd
    let eventNameProcAddCallfunAdd = get(opt, 'eventNameProcAddCallfunAdd')
    if (!isestr(eventNameProcAddCallfunAdd)) {
        eventNameProcAddCallfunAdd = 'proc-add-callfun-add'
    }

    //eventNameProcDiffCallfunModify
    let eventNameProcDiffCallfunModify = get(opt, 'eventNameProcDiffCallfunModify')
    if (!isestr(eventNameProcDiffCallfunModify)) {
        eventNameProcDiffCallfunModify = 'proc-diff-callfun-modify'
    }

    //eventNameProcRemoveCallfunRemove
    let eventNameProcRemoveCallfunRemove = get(opt, 'eventNameProcRemoveCallfunRemove')
    if (!isestr(eventNameProcRemoveCallfunRemove)) {
        eventNameProcRemoveCallfunRemove = 'proc-remove-callfun-remove'
    }

    //eventNameProcCallfunAfterStart
    let eventNameProcCallfunAfterStart = get(opt, 'eventNameProcCallfunAfterStart')
    if (!isestr(eventNameProcCallfunAfterStart)) {
        eventNameProcCallfunAfterStart = 'proc-callfun-afterStart'
    }

    //eventNameProcCallfunBeforeEnd
    let eventNameProcCallfunBeforeEnd = get(opt, 'eventNameProcCallfunBeforeEnd')
    if (!isestr(eventNameProcCallfunBeforeEnd)) {
        eventNameProcCallfunBeforeEnd = 'proc-callfun-beforeEnd'
    }

    //eventNameProcCoreDetect
    let eventNameProcCoreDetect = get(opt, 'eventNameProcCoreDetect')
    if (!isestr(eventNameProcCoreDetect)) {
        eventNameProcCoreDetect = 'proc-coreDetect'
    }

    //eventNameProcRetakeRemove
    let eventNameProcRetakeRemove = get(opt, 'eventNameProcRetakeRemove')
    if (!isestr(eventNameProcRetakeRemove)) {
        eventNameProcRetakeRemove = 'proc-retake-remove'
    }

    //eventNameProcCoreRetake
    let eventNameProcCoreRetake = get(opt, 'eventNameProcCoreRetake')
    if (!isestr(eventNameProcCoreRetake)) {
        eventNameProcCoreRetake = 'proc-coreRetake'
    }

    //ev
    let ev = evem()

    //_srlog
    let _srlog = WSyslog({
        fdLog,
        interval: 'hr',
    })

    //srlog
    let srlog = {
        info: (msg) => {
            _srlog.info(msg)
            ev.emit('change', { type: 'info', ...msg })
        },
        warn: (msg) => {
            _srlog.warn(msg)
            ev.emit('change', { type: 'warn', ...msg })
        },
        error: (msg) => {
            _srlog.error(msg)
            ev.emit('change', { type: 'error', ...msg })
        },
    }

    //addTagCore
    let addTagCore = async (mode, fn, hash = '') => {

        //fdTag
        let fdTag = ''
        if (mode === 'add') {
            // fdTag = fdTagAdd
            throw new Error(`does not support add`)
        }
        else if (mode === 'modify') {
            // fdTag = fdTagModify
            throw new Error(`does not support modify`)
        }
        else if (mode === 'remove') {
            fdTag = fdTagRemove
        }
        else {
            throw new Error(`invalid mode[${mode}]`)
        }

        //fp, 增加/變更/刪除清單資料夾內之檔案路徑
        let fp = `${fdTag}/${fn}`

        // //check, 防抖要能刷新起算時間, 故要持續writeFileSync
        // if (fsIsFile(fp)) {
        //     return
        // }

        //o
        let o = {
            time: now2str(),
            hash,
        }

        //writeFileSync
        fs.writeFileSync(fp, JSON.stringify(o), 'utf8')

    }

    // //addTagAdd
    // let addTagAdd = async (fn) => {
    //     let r = await addTagCore('add', fn)
    //     return r
    // }

    // //addTagModify
    // let addTagModify = async (fn, hash) => {
    //     let r = await addTagCore('modify', fn, hash)
    //     return r
    // }

    //addTagRemove
    let addTagRemove = async (fn) => {
        let r = await addTagCore('remove', fn)
        return r
    }

    //checkTagCore
    let checkTagCore = async (mode, fn, opt = {}) => {

        //checkTime
        let checkTime = get(opt, 'checkTime')
        if (!isbol(checkTime)) {
            checkTime = true
        }

        //timeNow
        let timeNow = get(opt, 'timeNow')

        //fdTag, timeTolerance
        let fdTag = ''
        let timeTolerance = 0
        if (mode === 'add') {
            // fdTag = fdTagAdd
            // timeTolerance = timeToleranceAdd
            throw new Error(`does not support add`)
        }
        else if (mode === 'modify') {
            // fdTag = fdTagModify
            // timeTolerance = timeToleranceModify
            throw new Error(`does not support modify`)
        }
        else if (mode === 'remove') {
            fdTag = fdTagRemove
            timeTolerance = timeToleranceRemove
        }
        else {
            throw new Error(`invalid mode[${mode}]`)
        }

        //fp, 增加/變更/刪除清單資料夾內之檔案路徑
        let fp = `${fdTag}/${fn}`

        //check, 預期要有檔案, 若無檔案無法讀取內容
        if (!fsIsFile(fp)) {
            return {
                b: false,
                msg: `fp[${fp}] is not a file`,
            }
        }

        //checkTime
        if (!checkTime) {
            return {
                b: true,
                msg: `fp[${fp}] exists`,
            }
        }

        //check
        if (!iseobj(timeNow)) {
            throw new Error(`invalid timeNow`) //預期調用checkTagCore時若checkTime=true就一定要給timeNow, 沒給就報錯確保程式一定要通過單元測試
        }

        //j
        let j = fs.readFileSync(fp, 'utf8')

        //o
        let o = JSON.parse(j)

        //time
        let time = get(o, 'time')

        //ts
        let ts = ot(time)

        //te
        let te = timeNow

        //num
        let num = te.diff(ts, 'millisecond')

        //b
        let b = num >= timeTolerance
        // console.log(mode, fn, `num[${num}] >= timeTolerance[${timeTolerance}]`, b, 'checkTime', checkTime)
        if (b) {
            return {
                b,
                msg: `time difference[${num}] >= time tolerance[${timeTolerance}]`,
            }
        }
        else {
            return {
                b,
                msg: `allowable time difference`,
            }
        }
    }

    // //checkTagAdd
    // let checkTagAdd = async (fn, opt = {}) => {
    //     let r = await checkTagCore('add', fn, opt)
    //     return r
    // }

    // //checkTagModify
    // let checkTagModify = async (fn, opt = {}) => {
    //     let r = await checkTagCore('modify', fn, opt)
    //     return r
    // }

    //checkTagRemove
    let checkTagRemove = async (fn, opt = {}) => {
        let r = await checkTagCore('remove', fn, opt)
        return r
    }

    //releaseTagCore
    let releaseTagCore = async (mode, fn) => {

        //fdTag
        let fdTag = ''
        if (mode === 'add') {
            // fdTag = fdTagAdd
            throw new Error(`does not support add`)
        }
        else if (mode === 'modify') {
            // fdTag = fdTagModify
            throw new Error(`does not support modify`)
        }
        else if (mode === 'remove') {
            fdTag = fdTagRemove
        }
        else {
            throw new Error(`invalid mode[${mode}]`)
        }

        //fp, 增加/變更/刪除清單資料夾內之檔案路徑
        let fp = `${fdTag}/${fn}`

        //check, 若有檔案才刪除
        if (!fsIsFile(fp)) {
            return
        }

        //j
        let j = fs.readFileSync(fp, 'utf8')

        //o
        let o = JSON.parse(j)

        //fsDeleteFile
        let r = fsDeleteFile(fp)

        //check
        if (r.error) {
            throw new Error(r.error)
        }

        return o
    }

    // //releaseTagAdd
    // let releaseTagAdd = async (fn) => {
    //     let r = await releaseTagCore('add', fn)
    //     return r
    // }

    // //releaseTagModify
    // let releaseTagModify = async (fn) => {
    //     let r = await releaseTagCore('modify', fn)
    //     return r
    // }

    //releaseTagRemove
    let releaseTagRemove = async (fn) => {
        let r = await releaseTagCore('remove', fn)
        return r
    }

    //coreDetect
    let otkActualSrc = null
    let otkSrc = null
    let coreDetect = async() => {

        //因core執行初期ev尚未回傳給外部監聽, 故須delay延遲脫勾
        await delay(1)

        srlog.info({ event: 'start', msg: 'running...' })

        //ts
        let ts = ot()

        //calcTimeRun
        let calcTimeRun = () => {

            //te
            let te = ot()

            //s
            let s = te.diff(ts, 'second')

            //r
            let r = {
                timeRunStart: ts.format('YYYY-MM-DDTHH:mm:ssZ'),
                timeRunEnd: te.format('YYYY-MM-DDTHH:mm:ssZ'),
                timeRunSpent: `${s}s`,
            }

            return r
        }


        //msgExit
        let msgExit = ''

        //funAfterStart
        if (isfun(funAfterStart)) {
            try {
                srlog.info({ event: eventNameProcCallfunAfterStart, msg: 'start...' })

                //funAfterStart
                let q = funAfterStart()
                if (ispm(q)) {
                    q = await q
                }

                srlog.info({ event: eventNameProcCallfunAfterStart, msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcCallfunAfterStart, msg: getErrorMessage(err) })
                msgExit = 'error at proc-callfun-afterStart'
            }
        }

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        //fsTaskCp
        let otkActual = fsTaskCp(fdTaskCpActualSrc, fdTaskCpActualSrc) //因不使用偵測端, 故設定fdTar=fdSrc

        //otkActualSrc
        otkActualSrc = otkActual.buildSrc()
        // otkActualSrc.on('set', (msg) => {
        //     // console.log(`src send task...`, msg)
        // })
        // otkActualSrc.on('remove', (msg) => {
        //     // console.log(`src send task...`, msg)
        // })

        //fsTaskCp
        let otk = fsTaskCp(fdTaskCpSrc, fdTaskCpSrc) //因不使用偵測端, 故設定fdTar=fdSrc

        //otkSrc
        otkSrc = otk.buildSrc()
        // otkSrc.on('set', (msg) => {
        //     // console.log(`src send task...`, msg)
        // })
        // otkSrc.on('remove', (msg) => {
        //     // console.log(`src send task...`, msg)
        // })

        //itemsAtt
        let itemsAtt = []
        if (true) {
            try {
                srlog.info({ event: eventNameProcCallfunGetNew, msg: 'start...' })

                //funGetNew
                let q = funGetNew()
                if (ispm(q)) {
                    q = await q
                }

                //save
                itemsAtt = q

                srlog.info({ event: eventNameProcCallfunGetNew, num: size(q), msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcCallfunGetNew, msg: getErrorMessage(err) })
                msgExit = 'error at proc-callfun-getNew'
            }
        }

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        //itemsCur
        let itemsCur = []
        if (true) {
            try {
                srlog.info({ event: eventNameProcCallfunGetCurrent, msg: 'start...' })

                //funGetCurrent
                let q = funGetCurrent()
                if (ispm(q)) {
                    q = await q
                }

                //save
                itemsCur = q

                srlog.info({ event: eventNameProcCallfunGetCurrent, num: size(q), msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcCallfunGetCurrent, msg: getErrorMessage(err) })
                msgExit = 'error at proc-callfun-getCurrent'
            }
        }

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        //check, itemsAtt第1次執行預期一定有數據, 第n次執行無數據視為非預期被清空須報錯
        if (size(itemsAtt) === 0) {
            console.log(`invalid data, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: 'no data' })
            return
        }

        // //check, itemsCur第1次執行會無數據, 不能偵測報錯
        // if (size(itemsCur) === 0) {
        //     console.log(`invalid data, task canceled`) //程序發生錯誤, 不進行後續動作
        //     srlog.info({ event: 'cancel', ...calcTimeRun(), msg: 'no data' })
        //     return
        // }

        // //check
        // if (size(itemsCur) - size(itemsAtt) > 10) {
        //     console.log(`difference between the data before and after is too large, size(itemsCur)[${size(itemsCur)}]-size(itemsAtt)[${size(itemsAtt)}]>10`) //當前取得數據與已儲存數據之數量差距超過10, 不進行後續動作, 當前取得數據筆數[${size(itemsAtt)}], 已儲存數據筆數[${size(itemsCur)}]
        //     srlog.info({ event: 'cancel', ...calcTimeRun(), msg: 'difference between the data before and after is too large' })
        //     return
        // }

        //ltdtDiffByKey
        let r = null
        if (true) {
            try {
                srlog.info({ event: 'compare', msg: 'start...' })

                //ltdtSrc, ltdtTar
                let ltdtSrc = itemsAtt
                // console.log('ltdtSrc', ltdtSrc)
                let ltdtTar = itemsCur
                // console.log('ltdtTar', ltdtTar)

                //ltdtDiffByKey
                r = ltdtDiffByKey(ltdtTar, ltdtSrc, keyId, { withInfor: false })
                // console.log('ltdtDiffByKey', r)
                //   del: [ {...} ],
                //   add: [ {...} ],
                //   same: [ {...} ],
                //   diff: [ {...} ],
                let numDel = size(r.del)
                let numAdd = size(r.add)
                let numDiff = size(r.diff)
                let numSame = size(r.same)

                srlog.info({ event: 'compare', numRemove: numDel, numAdd, numModify: numDiff, numSame, msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: 'compare', msg: getErrorMessage(err) })
            }
        }

        //check
        if (!iseobj(r)) {
            console.log(`can not calculate the difference, task canceled`) //無法計算當前取得與已儲存數據之差異, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: 'can not calculate the difference between the data before and after' })
            return
        }

        //check
        if (size(r.del) === 0 && size(r.add) === 0 && size(r.diff) === 0) {
            //當前取得與已儲存數據無差異, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: 'no difference' })
            return
        }

        //trigger del
        await pmSeries(r.del, async(v) => {

            //check
            if (isestr(msgExit)) {
                return
            }

            try {
                srlog.info({ event: eventNameProcRemoveCallfunRemove, [keyId]: v[keyId], msg: 'start...' })

                //funRemove
                if (isfun(funRemove)) {
                    let q = funRemove(v)
                    if (ispm(q)) {
                        q = await q
                    }
                }

                // srlog.info({ event: eventNameProcRemoveCallfunRemove, [keyId]: v[keyId], msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcRemoveCallfunRemove, [keyId]: v[keyId], msg: getErrorMessage(err) })
                msgExit = 'error at proc-remove-callfun-remove'
            }

            //check
            if (isestr(msgExit)) {
                return
            }

            try {

                //otkActualSrc.remove
                otkActualSrc.remove(v[keyId])

                //check
                if (timeToleranceRemove <= 0) {
                    //若未給予刪除誤差

                    //otkSrc.remove
                    otkSrc.remove(v[keyId])

                    srlog.info({ event: eventNameProcRemoveCallfunRemove, [keyId]: v[keyId], msg: 'done' })
                }
                else {
                    //若有給予刪除誤差

                    //checkTagRemove
                    let r = await checkTagRemove(v[keyId], { checkTime: false })

                    //check, 是否位於刪除清單
                    if (r.b) {
                        //若位於刪除清單, 不處理
                    }
                    else {
                        //若非位於刪除清單, 呼叫addTagRemove新增[刪除tag]

                        //addTagRemove
                        await addTagRemove(v[keyId])

                        srlog.info({ event: eventNameProcRemoveCallfunRemove, [keyId]: v[keyId], msg: 'add-tag' })
                    }

                }

            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcRemoveCallfunRemove, [keyId]: v[keyId], msg: getErrorMessage(err) })
                msgExit = 'error at proc-remove-callfun-remove'
            }

        })

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        //trigger add
        await pmSeries(r.add, async(v) => {

            //check
            if (isestr(msgExit)) {
                return
            }

            try {
                srlog.info({ event: eventNameProcAddCallfunAdd, [keyId]: v[keyId], msg: 'start...' })

                //funAdd
                if (isfun(funAdd)) {
                    let q = funAdd(v)
                    if (ispm(q)) {
                        q = await q
                    }
                }

                // srlog.info({ event: eventNameProcAddCallfunAdd, [keyId]: v[keyId], msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcAddCallfunAdd, [keyId]: v[keyId], msg: getErrorMessage(err) })
                msgExit = 'error at proc-add-callfun-add'
            }

            //check
            if (isestr(msgExit)) {
                return
            }

            try {

                //hash
                let hash = str2b64(JSON.stringify(v))

                //otkActualSrc.set
                otkActualSrc.set(v[keyId], hash)

                //otkSrc.set, 因可能有非預期中斷與重啟問題, 故一律呼叫otkSrc.set, 確保跟實際otkActualSrc.set能有一致任務清單
                otkSrc.set(v[keyId], hash)

                //check
                if (timeToleranceRemove > 0) {
                    //若有給予刪除誤差

                    //checkTagRemove
                    let r = await checkTagRemove(v[keyId], { checkTime: false })

                    //check, 是否位於刪除清單
                    if (r.b) {
                        //若位於刪除清單, 呼叫releaseTagRemove清除[刪除tag]

                        //releaseTagRemove
                        await releaseTagRemove(v[keyId])

                        srlog.info({ event: eventNameProcAddCallfunAdd, [keyId]: v[keyId], msg: 'release-tag' })
                    }
                    else {
                        //若非位於刪除清單, 不處理
                    }

                }

                srlog.info({ event: eventNameProcAddCallfunAdd, [keyId]: v[keyId], msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcAddCallfunAdd, [keyId]: v[keyId], msg: getErrorMessage(err) })
                msgExit = 'error at proc-add-callfun-add'
            }

        })

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        //trigger diff
        await pmSeries(r.diff, async(v) => {

            //check
            if (isestr(msgExit)) {
                return
            }

            try {
                srlog.info({ event: eventNameProcDiffCallfunModify, [keyId]: v[keyId], msg: 'start...' })

                //funModify
                if (isfun(funModify)) {
                    let q = funModify(v)
                    if (ispm(q)) {
                        q = await q
                    }
                }

                // srlog.info({ event: eventNameProcDiffCallfunModify, [keyId]: v[keyId], msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcDiffCallfunModify, [keyId]: v[keyId], msg: getErrorMessage(err) })
                msgExit = 'error at proc-diff-callfun-modify'
            }

            //check
            if (isestr(msgExit)) {
                return
            }

            try {

                //hash
                let hash = str2b64(JSON.stringify(v))

                //otkActualSrc.set
                otkActualSrc.set(v[keyId], hash)

                //otkSrc.set, 因可能有非預期中斷與重啟問題, 故一律呼叫otkSrc.set, 確保跟實際otkActualSrc.set能有一致任務清單
                otkSrc.set(v[keyId], hash)

                srlog.info({ event: eventNameProcDiffCallfunModify, [keyId]: v[keyId], msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcDiffCallfunModify, [keyId]: v[keyId], msg: getErrorMessage(err) })
                msgExit = 'error at proc-diff-callfun-modify'
            }

        })

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        //funBeforeEnd
        if (isfun(funBeforeEnd)) {
            try {
                srlog.info({ event: eventNameProcCallfunBeforeEnd, msg: 'start...' })

                //funBeforeEnd
                let q = funBeforeEnd()
                if (ispm(q)) {
                    q = await q
                }

                srlog.info({ event: eventNameProcCallfunBeforeEnd, msg: 'done' })
            }
            catch (err) {
                console.log(err)
                srlog.error({ event: eventNameProcCallfunBeforeEnd, msg: getErrorMessage(err) })
                msgExit = 'error at proc-callfun-beforeEnd'
            }
        }

        //check
        if (isestr(msgExit)) {
            console.log(`error occurred, task canceled`) //程序發生錯誤, 不進行後續動作
            srlog.info({ event: 'cancel', ...calcTimeRun(), msg: msgExit })
            return
        }

        srlog.info({ event: 'end', ...calcTimeRun(), msg: 'done' })
    }

    let pmDetect = coreDetect()
        .catch((err) => {
            console.log(err)
            srlog.error({ event: eventNameProcCoreDetect, msg: getErrorMessage(err) })
        })

    let coreRetake = async() => {

        //wait
        await waitFun(() => {
            return otkSrc !== null
        })

        //timeNow
        let timeNow = ot()

        //vfpsRemove
        let vfpsRemove = fsTreeFolder(fdTagRemove, 1)

        // //vfpsModify
        // let vfpsModify = fsTreeFolder(fdTagModify, 1)

        //check
        // if (size(vfpsRemove) === 0 && size(vfpsModify) === 0) {
        //     return
        // }
        if (size(vfpsRemove) === 0) {
            return
        }

        await pmSeries(vfpsRemove, async(v) => {

            //checkTagRemove
            let r = await checkTagRemove(v.name, { timeNow, checkTime: true }) //v.name對應v[keyId]

            //b
            let b1 = r.b //刪除任務之時間已超過容許值門檻
            let b2 = !isestr(otkActualSrc.get(v.name)) //v.name對應v[keyId], 執行偵測完整任務內已不存在v[keyId]
            let b3 = isestr(otkSrc.get(v.name)) //v.name對應v[keyId], 執行偵測觸發任務內仍存在v[keyId]
            let b = b1 && b2 && b3 //因可能有非預期中斷與重啟問題, 故須同時檢測
            // console.log('b1', b1, 'b2', b2, 'b3', b3, 'b', b)

            //check
            if (b) {
                //已滿足刪除任務所有條件, 呼叫releaseTagRemove清除[刪除tag], 與呼叫otkSrc.remove

                await releaseTagRemove(v.name) //v.name對應v[keyId]

                srlog.info({ event: eventNameProcRetakeRemove, [keyId]: v.name, from: 'debounce', msg: 'release-tag' })

                otkSrc.remove(v.name) //v.name對應v[keyId]

                srlog.info({ event: eventNameProcRetakeRemove, [keyId]: v.name, from: 'debounce', msg: 'done' })

            }
            else {
                //時間差未超過容許值門檻, 不處理
            }

        })

        // await pmSeries(vfpsModify, async(v) => {

        //     //checkTagModify
        //     let r = await checkTagModify(v.name, { timeNow, checkTime: true }) //v.name對應v[keyId]

        //     //check, 變更任務之時間是否已超過容許值門檻
        //     if (r.b) {

        //         //時間差已超過容許值門檻, 則須呼叫releaseTagModify偵測與清除變更tag, 再呼叫otkSrc.set
        //         let rModify = await releaseTagModify(v.name)
        //         otkSrc.set(v.name, rModify.hash) //v.name對應v[keyId]

        //         srlog.info({ event: 'proc-diff-modify', [keyId]: v.name, from: 'debounce', msg: 'done' })

        //     }
        //     else {
        //         //時間差未超過容許值門檻, 不處理
        //     }

        // })

    }

    let pmRetake = coreRetake()
        .catch((err) => {
            console.log(err)
            srlog.error({ event: eventNameProcCoreRetake, msg: getErrorMessage(err) })
        })

    //save
    ev.srlog = srlog

    //emit end
    Promise.all([pmDetect, pmRetake])
        .finally(() => {
            ev.emit('end')
        })

    return ev
}


export default WDataScheduler
