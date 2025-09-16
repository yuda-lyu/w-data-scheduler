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

//funGetNew
let funGetNew = async() => {
    let items = [
        {
            'id': '114115',
            'hash': 'abc',
        },
        {
            'id': '114116',
            'hash': 'def',
        },
    ]
    return items
}

//funGetCurrent
let funGetCurrent = async() => {
    let items = [
        {
            'id': '114115',
            'hash': 'abc',
        },
    ]
    return items
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

let opt = {
    fdTagRemove,
    fdTaskCpActualSrc,
    fdTaskCpSrc,
    funGetNew,
    funGetCurrent,
    funRemove,
    funAdd,
    funModify,
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
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-getNew', msg: 'start...' }
// change { event: 'proc-callfun-getNew', num: 2, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 1, msg: 'done' }
// change { event: 'proc-compare', msg: 'start...' }
// change {
//   event: 'proc-compare',
//   numRemove: 0,
//   numAdd: 1,
//   numModify: 0,
//   numSame: 1,
//   msg: 'done'
// }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
// change { event: 'end', msg: 'done' }


//node g.mjs
