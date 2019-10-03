/* helper functions
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
        let isBigInt = _useBigInt && typeof int === "bigint";
        
        if((typeof int !== "number" && !isBigInt) || int < 0)
            throw new Error("int must be a number or bigint 'int >= 0'");
        if(typeof base !== "undefined" && (typeof base !== "number" || base < 2))
            throw new Error("base must be a number between 2 and "+_intStr.length+". default: "+_intStr.length);
        
        if(!isBigInt) int = Math.floor(int);
        
        if(!base || base > _intStr.length) 
            base = _intStr.length;
        
        if(base <= 36) return int.toString(base);
        if(int === 0)  return _intStr.charAt(0);
        
        if(isBigInt) base = BigInt(base);
        
        let res = "";
        let mod;
        
        while(int > 0)
        {
            mod = int % base;
            int = int / base;
            res = _intStr.charAt(Number(mod)) + res;
            
            if(!isBigInt) int = Math.floor(int);
        }
        return res;
    }
    
    function _strToInt(str, base)
    {
        if(typeof str !== "string")
            throw new Error("str must be of type string");
        if(typeof base !== "undefined" && (typeof base !== "number" || base < 2))
            throw new Error("base must be a number between 2 and "+_intStr.length+". default: "+_intStr.length);
        
        if(!base || base > _intStr.length) 
            base = _intStr.length;
        
        if(base <= 36) return parseInt(str, base);
        if(str === _intStr.charAt(0)) return 0;
        
        let isBigInt = false;
        
        let res = 0;
        let add;
        let tmp;
        
        base = Math.floor(base);
        for(let i = 0; i < str.length; i++)
        {
            add = _intStr.indexOf(str.charAt(i));
            tmp = res * base;
            
            if(_useBigInt && !isBigInt && tmp > 9e15) 
            {
                isBigInt = true;
                res      = BigInt(res);
                base     = BigInt(base);
                
                tmp = res * base;
            }
            
            res = tmp + (isBigInt ? BigInt(add) : add);
        }
        return res;
    }
    
    function _getRandomString(len, base)
    {
        var str = ""; len = len || 16; base = base || 68;

        while(str.length < len)
        {
            if(_useBigInt)
                str += _intToStr(BigInt(Math.floor(Math.random() * 9e15)) * BigInt("999999999999999"), base);
            else
                str += _intToStr(Math.random() * 9e15, base);
        }
        return str.substr(0, len);
    }
    
    function _mergeConf(cnf1, cnf2)
    {
        var cnf = JSON.parse(JSON.stringify(cnf1));
        
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
