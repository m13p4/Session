/* helper functions
 * 
 * @author Meliantchenkov Pavel
 * @version 1.0
 */
(function(module)
{
    var _intStr    = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_.~!*=,;()$:+@#/&?'\"\\[]{}|<>%§²³°^€µ¿",
        _useBigInt = typeof BigInt === "function",
        _Floor     = typeof Math.trunc === "function" ? Math.trunc : Math.floor;
    
    function _intToStr(int, base, intStr)
    {
        let isBigInt = _useBigInt && typeof int === "bigint";
        
        if(typeof intStr !== "undefined" && typeof intStr !== "string")
            throw new Error("intStr must be a string");
        intStr = intStr || _intStr;

        if((typeof int !== "number" && !isBigInt) || int < 0)
            throw new Error("int must be a number or bigint 'int >= 0'");
        if(typeof base !== "undefined" && (typeof base !== "number" || base < 2))
            throw new Error("base must be a number between 2 and "+intStr.length+". default: "+intStr.length); 
        
        if(!isBigInt) int = _Floor(int);
        if(!base || base > intStr.length) 
            base = intStr.length;
        
        if(int === 0)  return intStr.charAt(0);
        
        if(isBigInt) base = BigInt(base);
        
        let res = ""; let mod;
        
        while(int > 0)
        {
            mod = int % base;
            int = int / base;
            res = intStr.charAt(Number(mod)) + res;
            
            if(!isBigInt) int = _Floor(int);
        }
        return res;
    }
    
    function _strToInt(str, base, intStr)
    {
        if(typeof intStr !== "undefined" && typeof intStr !== "string")
            throw new Error("intStr must be a string");
        intStr = intStr || _intStr;

        if(typeof str !== "string")
            throw new Error("str must be of type string");
        if(typeof base !== "undefined" && (typeof base !== "number" || base < 2))
            throw new Error("base must be a number between 2 and "+intStr.length+". default: "+intStr.length);
        
        if(!base || base > intStr.length) base = intStr.length;
        if(str === intStr.charAt(0))      return 0;
        base = _Floor(base);
        
        let isBigInt = false;
        let res = 0;
        let add;
        let tmp;
        
        for(let i = 0; i < str.length; i++)
        {
            add = intStr.indexOf(str.charAt(i));
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
        let str = ""; len = len || 16; base = base || 74;
        let intStr = _shufleStr(_intStr.substr(0, base));

        while(str.length < len)
            str += _intToStr(Math.random() * 9e15, base, intStr);

        return str.substr(Math.random() * (str.length - len), len);
    }
    
    function _mergeConf(cnf1, cnf2)
    {
        var  cnf = JSON.parse(JSON.stringify(cnf1));
        var _cnf = JSON.parse(JSON.stringify(cnf2));
        
        for(var i in _cnf) 
            cnf[i] = _cnf[i];
        return cnf;
    }

    function _shufleStr(str)
    {
        str = str || "";
        let i = str.length;
        let s = "";
        
        while(i--)
        {
            let r  = _Floor(Math.random() * (i+1));
            s  += str.charAt(r);
            str = str.substr(0, r) + str.substr(r+1);
        }
        return s;
    }
    
    module.exports = {
        getRandomString: _getRandomString,
        intToStr:        _intToStr,
        strToInt:        _strToInt,
        mergeConf:       _mergeConf,
        shufleStr:       _shufleStr
    };
})(typeof module !== "undefined" ? module : {});
