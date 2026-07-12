import * as LucidPkg from "@lucid-evolution/lucid";

const keys = Object.keys(LucidPkg);
console.log("Matching exports for 'script':", keys.filter(k => k.toLowerCase().includes("script")));
console.log("Matching exports for 'policy':", keys.filter(k => k.toLowerCase().includes("policy")));
console.log("Matching exports for 'mint':", keys.filter(k => k.toLowerCase().includes("mint")));
console.log("Matching exports for 'utils':", keys.filter(k => k.toLowerCase().includes("utils")));
