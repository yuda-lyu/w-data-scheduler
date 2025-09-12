# w-data-scheduler
A scheduler for data.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-data-scheduler.svg?style=flat)](https://npmjs.org/package/w-data-scheduler) 
[![license](https://img.shields.io/npm/l/w-data-scheduler.svg?style=flat)](https://npmjs.org/package/w-data-scheduler) 
[![npm download](https://img.shields.io/npm/dt/w-data-scheduler.svg)](https://npmjs.org/package/w-data-scheduler) 
[![npm download](https://img.shields.io/npm/dm/w-data-scheduler.svg)](https://npmjs.org/package/w-data-scheduler) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-data-scheduler.svg)](https://www.jsdelivr.com/package/npm/w-data-scheduler)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-data-scheduler/global.html).

## Installation
### Using npm(ES6 module):
```alias
npm i w-data-scheduler
```

#### Example:
> **Link:** [[dev source code](https://github.com/yuda-lyu/w-data-scheduler/blob/master/g.mjs)]
```alias
import fs from 'fs'
import _ from 'lodash-es'
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
        {
            'id': '114116',
            'hash': 'def',
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
// change { event: 'proc-callfun-getNew', num: 1, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 2, msg: 'done' }
// change { event: 'compare', msg: 'start...' }
// change {
//   event: 'compare',
//   numRemove: 1,
//   numAdd: 0,
//   numModify: 0,
//   numSame: 1,
//   msg: 'done'
// }
// change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'start...' }
// change { event: 'proc-remove-callfun-remove', id: '114116', msg: 'done' }
// change { event: 'end', msg: 'done' }
```
