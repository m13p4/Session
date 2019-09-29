/*
 * Helper methods.
 * 
 * @author Meliantchenkov Pavel
 * @version 1.0
 */
(function(module)
{
    var _intStr = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_.~!*=+|$#()[]{}<>:,;?&%§²³@°^/\\'\"€µ¿",
        _useBigInt = typeof BigInt === "function";
    
    function _intToStr(int, base)
    {
        //console.log(typeof int, int);
        let isBigInt = _useBigInt && typeof int === "bigint";
        
        if(!isBigInt) int = Math.floor(int);
        
        if(base < 0) base = -base;
        
        if(!base || base > _intStr.length || base < 2) 
            base = _intStr.length;
        
        if(base <= 36) return int.toString(base);
        if(int === 0)  return _intStr.charAt(0);
        
        if(isBigInt) base = BigInt(base);
        
        let result = "";
        let mod;
        
        while(int > 0)
        {
            mod    = int % base;
            int    = isBigInt ? int / base : Math.floor(int / base);
            result = _intStr.charAt(Number(mod)) + result;
        }
        
        return result;
    }
    
    //hgdfhjgf
    function _strToInt(str, base)
    {
        if(base < 0) base = -base;
        
        if(!base || base > _intStr.length || base < 2) 
            base = _intStr.length;
        
        if(base <= 36) return parseInt(str, base);
        if(str === _intStr.charAt(0)) return 0;
        
        let isBigInt = false;
        
        let result = 0;
        let add;
        let tmp;
        
        for(let i = 0; i < str.length; i++)
        {
            add = _intStr.indexOf(str.charAt(i));
            tmp = result * base;
            
            if(_useBigInt && !isBigInt && tmp > 9e15) 
            {
                isBigInt = true;
                result   = BigInt(result);
                base     = BigInt(base);
                
                tmp = result * base;
            }
            
            result = tmp + (isBigInt ? BigInt(add) : add);
        }
        
        return result;
    }
    
    function _getRandomString(len, base)
    {
        var str = ""; len = len || 16; base = base || 68;

        while(str.length < len)
        {
            if(_useBigInt)
                str += _intToStr(BigInt(Math.floor(Math.random() * 9e15)) * 999999999999999n, base);
            else
                str += _intToStr(Math.random() * 9e15, base);
        }

        return str.substr(0, len);
    }
    
    
    function _mergeConf(cnf1, cnf2)
    {
        var cnf = JSON.parse(JSON.stringify(cnf1));
        
        //console.log(cnf, cnf2);
            for(var i in cnf2) 
                cnf[i] = cnf2[i];
        
        return cnf;
    }
    
    module.exports = {
        getRandomString: _getRandomString,
        intToStr:        _intToStr,
        strToInt:        _strToInt,
        mergeConf:       _mergeConf
    };
    
})(typeof module !== "undefined" ? module : {});
