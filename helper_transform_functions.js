function convert(input) {
    let inputlength = input.length;
    input = input.toLowerCase();
    let phonenumber = "";
    for (i = 0; i < inputlength; i++) {
        let character = input.charAt(i);
        switch(character) {
            case '0': phonenumber+="0";break;
            case '1': phonenumber+="1";break;
            case '2': phonenumber+="2";break;
            case '3': phonenumber+="3";break;
            case '4': phonenumber+="4";break;
            case '5': phonenumber+="5";break;
            case '6': phonenumber+="6";break;
            case '7': phonenumber+="7";break;
            case '8': phonenumber+="8";break;
            case '9': phonenumber+="9";break;
            case '-': phonenumber+="-";break;
            case  'a': case 'b': case 'c': phonenumber+="2";break;
            case  'd': case 'e': case 'f': phonenumber+="3";break;
            case  'g': case 'h': case 'i': phonenumber+="4";break;
            case  'j': case 'k': case 'l': phonenumber+="5";break;
            case  'm': case 'n': case 'o': phonenumber+="6";break;
            case  'p': case 'q': case 'r': case 's': phonenumber+="7";break;
            case  't': case 'u': case 'v': phonenumber+="8";break;
            case  'w': case 'x': case 'y': case 'z': phonenumber+="9";break;
        }
    }
    return phonenumber;
}

function fixCap(str) {
    arr = str.toLowerCase().split(" ");
    nStr = "";
    arr.forEach(function(elem) {
        nStr += " " + elem.charAt(0).toUpperCase() + elem.slice(1);
    });
    return nStr.trim();
}

function fixPhoneNumber(str) {
    if(str.indexOf('@') > -1) {
        return "";
    }
    str = str.replace(/\-|\.|\s|\(|\)|\`|\//g, "");
        if(str == "FR COUNSEL") {
        str = "";
    }
    if(str.length == 11 && str.slice(0,1) == 1) {
        str = str.slice(1);
    }
    if(str.length == 13) {
        str = str.slice(0, 10);
    }
    if(str.length == 14) {
        str = str.slice(1, 10);
    }
    if(str.indexOf('E') > -1) {
        str = str.slice(0, str.indexOf('E'));
    }
    if(str.indexOf('X') > -1) {
        str = str.slice(0, str.indexOf('X'));
    }
    return convert(str);
}

function formatPhoneNumber(s) {
    let s2 = (""+s).replace(/\D/g, '');
    let m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
    return (!m) ? null : "(" + m[1] + ") " + m[2] + "-" + m[3];
  }

function getZipBase(zip_input) {
  let five_pat = /\d{5}\-\d{4}/
  let nine_pat = /\d{9}/
  if(zip_input && zip_input.toString()) {
    zip_input = zip_input.toString();
    if (five_pat.test(zip_input)) {
        return zip_input.split('-')[0];
    } else if (nine_pat.test(zip_input)) {
      return zip_input.substring(0,5);
    }
  }
  return zip_input;
}

function getZip4(zip_input) {
  let five_pat = /\d{5}\-\d{4}/
  let nine_pat = /\d{9}/

  zip_input = zip_input.toString()

  if(zip_input && zip_input.toString()) {
      if (five_pat.test(zip_input)) {
          return zip_input.split('-')[1];
      } else if (nine_pat.test(zip_input)) {
          return zip_input.substring(5);
      }
  }
  return '';
}

module.exports = {
  convert: convert,
  fixCap: fixCap,
  fixPhoneNumber: fixPhoneNumber,
  getZipBase: getZipBase,
  getZip4: getZip4
}
