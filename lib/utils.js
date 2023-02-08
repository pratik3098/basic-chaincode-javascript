'use strict';
const transits=require('./transits.json');

/**
 * @param {String} transitId
 * @returns {Bool}
*/
exports.isValidTransit=function(transitId){
    return transits.some(item => item.ID === transitId);
};


