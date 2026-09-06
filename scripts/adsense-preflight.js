const {validatePublisher}=require('./ads-policy');
function validSupportEmail(value) {
 return typeof value==='string' && /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}
function readiness(config,{cmpInstalled=false}={}) {
 const applicationGaps=[];
 if(!validSupportEmail(config.supportEmail)) applicationGaps.push('Publish a monitored support/privacy email supplied by the operator.');
 if(typeof config.operatorName!=='string' || !config.operatorName.trim()) applicationGaps.push('Confirm and publish the operator name.');
 try{validatePublisher(config.ads?.publisherId);}catch{applicationGaps.push('Configure the actual AdSense publisher ID.');}
 const adActivationGaps=[];
 if(config.ads?.approved!==true)adActivationGaps.push('Wait for Google site approval.');
 if(config.ads?.consentReady!==true || !cmpInstalled)adActivationGaps.push('Install and verify the certified CMP and privacy choices before serving ads.');
 if(!/^\d{10}$/.test(config.ads?.slotId||''))adActivationGaps.push('Configure a real manual article ad slot.');
 return {
  scope:'Configuration checks only; content review, delivery testing and AdSense account status must also be checked. This is not a Google approval prediction.',
  applicationReady:applicationGaps.length===0,
  applicationGaps,
  adServingReady:applicationGaps.length===0 && adActivationGaps.length===0,
  adActivationGaps,
  googleApproval:config.ads?.approved===true?'operator confirmed':'not confirmed'
 };
}
module.exports={readiness,validSupportEmail};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'..');
 const config=require('../site.config.json');
 config.supportEmail=process.env.SUPPORT_EMAIL||config.supportEmail;
 config.operatorName=process.env.OPERATOR_NAME||config.operatorName;
 config.ads.publisherId=process.env.ADSENSE_PUBLISHER_ID||config.ads.publisherId;
 const file=path.join(root,'content/cmp-snippet.html');
 console.log(JSON.stringify(readiness(config,{cmpInstalled:fs.existsSync(file)&&!!fs.readFileSync(file,'utf8').trim()}),null,2));
}
