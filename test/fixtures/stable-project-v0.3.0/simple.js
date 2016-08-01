"use strict";

var obj = {
    prop: {
        'subprop1':1
    },
    prop2: {
        subprop0: 0,
        "subprop2":2,
        'subprop3':3
    }

};

function f1() {}

f1({
    algo: {
    },
    "esto así":"asdfasd",
    "esto otro": 1,
    aquello: null,
    "mas uno": [ 
        "etc", 
        "etc",
        "etc",
    ]
});

f1({
    "key":""
});

function fn() {
    //USE_STRICT_MARK
    return 3+obj.prop.subprop2;
}

var f = fn();

f += 2;

