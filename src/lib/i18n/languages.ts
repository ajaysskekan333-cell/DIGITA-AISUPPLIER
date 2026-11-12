export const languageOptions = [
 {code:'mr',nativeName:'मराठी'},{code:'hi',nativeName:'हिंदी'},{code:'en',nativeName:'English'},
 {code:'gu',nativeName:'ગુજરાતી'},{code:'bn',nativeName:'বাংলা'},{code:'ta',nativeName:'தமிழ்'},
 {code:'te',nativeName:'తెలుగు'},{code:'kn',nativeName:'ಕನ್ನಡ'},{code:'ml',nativeName:'മലയാളം'},
 {code:'pa',nativeName:'ਪੰਜਾਬੀ'},{code:'ur',nativeName:'اردو'},{code:'or',nativeName:'ଓଡ଼ିଆ'},
 {code:'as',nativeName:'অসমীয়া'},{code:'ne',nativeName:'नेपाली'},{code:'sa',nativeName:'संस्कृतम्'},
 {code:'ks',nativeName:'कॉशुर'},{code:'kok',nativeName:'कोंकणी'},{code:'mai',nativeName:'मैथिली'},
 {code:'mni',nativeName:'মৈতৈলোন্'},{code:'sd',nativeName:'سنڌي'},{code:'doi',nativeName:'डोगरी'},
 {code:'brx',nativeName:'बड़ो'}
] as const;
export type Language = typeof languageOptions[number]['code'];
