const fs = require('fs');
const _ = require('underscore');

let OpenRefineReconcile = function(config) {
    let me = this;
    config = config || {}; // Defines it if not sent
    this.dt = {
        state: config.state || '',
        city: config.city || '',
        rulesPath: config.rulesPath || ''
    }

    function conversion() {
        let j = 0;
        let ruleObj = {};
        let rules = (me.dt['rulesPath'] != '') ? JSON.parse(fs.readFileSync(me.dt['rulesPath'], 'utf8')) : [];
        for (let i in rules) {
            let op = rules[i]['edits'];
            op = _.map(op,function(item) {
                delete(item['fromBlank']);
                delete(item['fromError']);
                if (rules[i].engineConfig.facets.length) {
                    item.state = rules[i].engineConfig.facets[0].selection[0].v.v;
                }
                return item;
            });
            if (ruleObj[rules[i]['columnName']]) {
                ruleObj[rules[i]['columnName']] = _.union(ruleObj[rules[i]['columnName']],op);
            } else {
                ruleObj[rules[i]['columnName']] = op;
            }
        }
        me.ruleObj = ruleObj;
    }
    conversion();

    function resolve(cityName, state) {
        try {
            if (cityName) {
				cityName = fixCap(cityName);
                for (let i=0; i<me.ruleObj.City.length; i++) {
                    if (cityName == me.ruleObj.City[i].to.replace(/\s{2,}/g, ' ')) {
                        return cityName;
                    } else if (state && (me.ruleObj.City[i].from.indexOf(cityName) != -1 && me.ruleObj.City[i].state == state)) {
                        // log.debug("CityName1:", "\nfrom: " + cityName, "\nto: " + me.ruleObj.City[i].to + "\n");
                        return me.ruleObj.City[i].to.replace(/\s{2,}/g, ' ');
                    } else if (me.ruleObj.City[i].from.indexOf(cityName) != -1) {
                        // log.debug("CityName2:", "\nfrom: " + cityName, "\nto: " + me.ruleObj.City[i].to + "\n");
                        return me.ruleObj.City[i].to.replace(/\s{2,}/g, ' ');
                    }
                }
                return cityName;
            }
        } catch(err) {
            log.error(err.stack);
        }
    }

    function fixCap(str) {
        arr = str.toLowerCase().split(" ");
        nStr = "";
        arr.forEach(function(elem) {
            nStr += " " + elem.charAt(0).toUpperCase() + elem.slice(1);
        });
        return nStr.trim();
    }

    // helper functions
    String.prototype.toProperCase = function () {
        return this.replace(/\w\S*/g, function(str){return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();});
    };

    return {
        resolve: resolve,
        conversion: conversion
    }

}

module.exports = OpenRefineReconcile;