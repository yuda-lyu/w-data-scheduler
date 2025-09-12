// import fs from 'fs'
// import _ from 'lodash-es'
import w from 'wsemi'
import WDataScheduler from './src/WDataScheduler.mjs'


//fdTagRemove
let fdTagRemove = './_tagRemove'
w.fsCleanFolder(fdTagRemove)

//fdTaskCpActualSrc
let fdTaskCpActualSrc = './_taskCpActualSrc'
w.fsCleanFolder(fdTaskCpActualSrc)

//fdTaskCpSrc
let fdTaskCpSrc = './_taskCpSrc'
w.fsCleanFolder(fdTaskCpSrc)

let items1 = [
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
]

let items2 = [ //add
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
    {
        'id': '114116',
        'tag': '2025082214061554116',
        'number': '116',
        'time': '2025-08-22T14:06:15+08:00',
        'timeRec': '2025-08-22 14:06:15',
        'timeTag': '20250822140615',
        'ml': '5.4',
    },
]

let items3 = [ //modify
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
    {
        'id': '114116',
        'tag': '2025082214061554116',
        'number': '116',
        'time': '2025-08-22T14:06:15+08:00',
        'timeRec': '2025-08-22 14:06:15',
        'timeTag': '20250822140615',
        'ml': '6.0',
    },
]

let items4 = [ //remove
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
]

let items5 = [ //add
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
    {
        'id': '114116',
        'tag': '2025082214061554116',
        'number': '116',
        'time': '2025-08-22T14:06:15+08:00',
        'timeRec': '2025-08-22 14:06:15',
        'timeTag': '20250822140615',
        'ml': '6.0',
    },
]

let items6 = [ //remove
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
]

let items7 = [ //add, 等超過容許值再add
    {
        'id': '114115',
        'tag': '2025082116374751115',
        'number': '115',
        'time': '2025-08-21T16:37:47+08:00',
        'timeRec': '2025-08-21 16:37:47',
        'timeTag': '20250821163747',
        'ml': '5.1',
    },
    {
        'id': '114116',
        'tag': '2025082214061554116',
        'number': '116',
        'time': '2025-08-22T14:06:15+08:00',
        'timeRec': '2025-08-22 14:06:15',
        'timeTag': '20250822140615',
        'ml': '6.0',
    },
]

let itemsOld = []

let trgs = [
    {
        stage: '1.ini',
        delay: 0,
        items: items1,
    },
    {
        stage: '2.add',
        delay: 2000,
        items: items2,
    },
    {
        stage: '3.modify',
        delay: 2000,
        items: items3,
    },
    {
        stage: '4.remove',
        delay: 2000,
        items: items4,
    },
    {
        stage: '5.add',
        delay: 2000,
        items: items5,
    },
    {
        stage: '6.remove',
        delay: 2000,
        items: items6,
    },
    {
        stage: '7.eff-add',
        delay: 6000,
        items: items7,
    },
]

let stage = ''
let itemsNow = null
w.pmSeries(trgs, async(trg,) => {
    await w.delay(trg.delay)
    stage = trg.stage
    itemsNow = trg.items
})


let run = async() => {
    console.log('running...')
    let pm = w.genPm()

    //funGetNew
    let funGetNew = async() => {
        return itemsNow
    }

    //funGetCurrent
    let funGetCurrent = async() => {
        return itemsOld
    }

    //funRemove
    let funRemove = async(v) => {
        //do somethings
    }

    //funAdd
    let funAdd = async(v) => {
        //do somethings
    }

    //funModify
    let funModify = async(v) => {
        //do somethings
    }

    //funBeforeEnd
    let funBeforeEnd = async(v) => {
        itemsOld = itemsNow
    }

    let opt = {
        fdTagRemove,
        fdTaskCpActualSrc,
        fdTaskCpSrc,
        funGetNew,
        funGetCurrent,
        funRemove,
        funAdd,
        funModify,
        funBeforeEnd,
        timeToleranceRemove: 4 * 1000, //4s
    }
    let ev = await WDataScheduler(opt)
        .catch((err) => {
            console.log(err)
        })
    ev.on('change', (msg) => {
        delete msg.type
        delete msg.timeRunStart
        delete msg.timeRunEnd
        delete msg.timeRunSpent
        if (w.arrHas(msg.event, [
            'start',
            'proc-callfun-getNew',
            'proc-callfun-getCurrent',
            'compare',
            'proc-callfun-beforeEnd',
        ])) {
            return
        }
        console.log('change', msg)
    })
    ev.on('end', () => {
        console.log('run end')
        pm.resolve()
    })

    return pm
}


let lock = false
let tr = setInterval(() => {

    if (lock) {
        return
    }
    lock = true

    run()
        .finally(() => {
            lock = false
        })

}, 1000)

let n = -1
let tt = setInterval(() => {
    n++
    console.log('n', n, `stage[${stage}]`)
    if (n >= 18) {
        clearInterval(tt)
        clearInterval(tr)
    }
}, 1000)
// running...
// n 0 stage[1.ini]
// change { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114115', msg: 'done' }
// change { event: 'end', msg: 'done' }
// run end
// n 1 stage[2.add]
// running...
// n 2 stage[2.add]
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
// change { event: 'end', msg: 'done' }
// run end
// n 3 stage[3.modify]
// running...
// change { event: 'proc-diff-callfun-modify', id: '114116', msg: 'start...' }
// change { event: 'proc-diff-callfun-modify', id: '114116', msg: 'done' }
// change { event: 'end', msg: 'done' }
// n 4 stage[3.modify]
// run end
// n 5 stage[4.remove]
// running...
// change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'start...' }
// change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'tag' }
// change { event: 'end', msg: 'done' }
// n 6 stage[4.remove]
// run end
// n 7 stage[5.add]
// running...
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'release-tag' }
// change { event: 'end', msg: 'done' }
// n 8 stage[5.add]
// run end
// n 9 stage[6.remove]
// running...
// change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'start...' }
// change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'tag' }
// change { event: 'end', msg: 'done' }
// n 10 stage[6.remove]
// run end
// n 11 stage[6.remove]
// running...
// change { event: 'cancel', msg: 'no difference' }
// n 12 stage[6.remove]
// run end
// n 13 stage[6.remove]
// running...
// change { event: 'cancel', msg: 'no difference' }
// n 14 stage[6.remove]
// change {
//   event: 'proc-retake-remove',
//   id: '114116',
//   from: 'debounce',
//   msg: 'release-tag'
// }
// change {
//   event: 'proc-retake-remove',
//   id: '114116',
//   from: 'debounce',
//   msg: 'done'
// }
// run end
// n 15 stage[7.eff-add]
// running...
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
// change { event: 'end', msg: 'done' }
// n 16 stage[7.eff-add]
// run end
// n 17 stage[7.eff-add]
// running...
// change { event: 'cancel', msg: 'no difference' }
// n 18 stage[7.eff-add]
// run end


//node g.timer.mjs
