#include "TrialController.h"
#if JUCE_MAC
 #include <Security/SecRandom.h>
#elif JUCE_WINDOWS
 #include <windows.h>
 #include <bcrypt.h>
#else
 #include <sys/random.h>
#endif
namespace zasu::trial {
static juce::int64 wall(){return juce::Time::currentTimeMillis()/1000;}
static juce::int64 monotonic(){return static_cast<juce::int64>(juce::Time::getMillisecondCounterHiRes()/1000);}
static juce::var body(std::initializer_list<std::pair<juce::String,juce::var>> properties){auto* obj=new juce::DynamicObject;for(auto& p:properties)obj->setProperty(juce::Identifier(p.first),p.second);return juce::var(obj);}
static juce::String verifier(){juce::MemoryBlock b(32);bool ok=false;
#if JUCE_MAC
 ok=SecRandomCopyBytes(kSecRandomDefault,b.getSize(),b.getData())==errSecSuccess;
#elif JUCE_WINDOWS
 ok=BCryptGenRandom(nullptr,static_cast<PUCHAR>(b.getData()),static_cast<ULONG>(b.getSize()),BCRYPT_USE_SYSTEM_PREFERRED_RNG)==0;
#else
 ok=getrandom(b.getData(),b.getSize(),0)==static_cast<ssize_t>(b.getSize());
#endif
 return ok?encodeUrl(b):juce::String();
}
Controller::Controller(juce::String p,juce::String m,juce::String e,Transport t,juce::File f):Thread("ZASU Trial"),product(p),modulus(m),endpoint(e),transport(std::move(t)){
 cache=f!=juce::File()?f:juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory).getChildFile("ZASU WORKS/Trial").getChildFile(product+".json");startThread();
}
Controller::~Controller(){signalThreadShouldExit();notify();{std::lock_guard<std::mutex> lock(streamMutex);if(currentStream)currentStream->cancel();}stopThread(-1);}
void Controller::status(juce::String ja,juce::String en){std::lock_guard<std::mutex> lock(mutex);japanese=std::move(ja);english=std::move(en);}
juce::String Controller::text(bool en)const{std::lock_guard<std::mutex> lock(mutex);return en?english:japanese;}
juce::String Controller::takeBrowserUrl(){std::lock_guard<std::mutex> lock(mutex);auto u=browserUrl;browserUrl.clear();return u;}
void Controller::begin(){bool expected=false;if(active()||!activating.compare_exchange_strong(expected,true))return;requested=true;notify();}
void Controller::record(Event event,int code){std::lock_guard<std::mutex> lock(mutex);if(!diagnostics.empty()&&diagnostics.back().event==event&&diagnostics.back().status==code)return;if(diagnostics.size()==32)diagnostics.erase(diagnostics.begin());diagnostics.push_back({event,code});}
juce::String Controller::diagnosticReport()const{
 // An allowlist of fixed labels, public-key digest and HTTP numbers. Never serialize server bodies or exceptions.
 static const char* names[]={"cache_missing","cache_restored","cache_rejected","activation_started","browser_ready","browser_opened","browser_open_failed","http_ok","http_failed","transport_failed","response_invalid","license_received","signature_rejected","signature_verified","cache_saved","cache_write_failed","activated","pending","server_rejected","activation_timed_out","license_format_rejected","license_header_rejected","public_key_rejected","license_claims_rejected","server_authentication_required","server_request_expired","server_unavailable","server_rate_limited","server_not_available"};
 juce::Array<juce::var> events;{std::lock_guard<std::mutex> lock(mutex);for(const auto& d:diagnostics)events.add(body({{"stage",names[static_cast<int>(d.event)]},{"http",d.status}}));}
 const auto publicBytes=modulus.toLowerCase().toUTF8();const auto fingerprint=juce::SHA256(publicBytes.getAddress(),publicBytes.sizeInBytes()-1).toHexString();
 return juce::JSON::toString(body({{"schema",1},{"build","trial-diagnostic-1"},{"publicKeySha256",fingerprint},{"active",active()},{"busy",busy()},{"events",events}}),true);
}
void Controller::browserLaunchResult(bool opened){record(opened?Event::browserOpened:Event::browserFailed);if(!opened)status(juce::String::fromUTF8("ブラウザを開けません。診断情報を確認してください。"),"Browser launch failed. Copy diagnostics.");}
void Controller::restore(){
 if(!cache.existsAsFile()){record(Event::cacheMissing);return;}
 if(cache.getSize()>8192){record(Event::cacheRejected);return;}
 auto c=juce::JSON::parse(cache);license=c["license"].toString();claims=verify(license,product,modulus);
 if(claims){record(Event::cacheRestored);clock.restore(claims->start,claims->expiry,std::max(claims->issued,juce::int64(c["observed"])),wall(),monotonic());tick();}else{license.clear();record(Event::cacheRejected);}
}
bool Controller::save(){
 if(!claims)return false;lastSave=wall();
 if(!cache.getParentDirectory().createDirectory()){record(Event::cacheWriteFailed);return cacheWritable=false;}
 juce::TemporaryFile temp(cache);auto data=body({{"license",license},{"observed",juce::int64(clock.observed())}});
 const bool saved=temp.getFile().replaceWithText(juce::JSON::toString(data,false))&&temp.overwriteTargetFileWithTemporary();
 record(saved?Event::cacheSaved:Event::cacheWriteFailed);return cacheWritable=saved;
}
void Controller::tick(){if(!claims)return;auto activeNow=clock.active(wall(),monotonic());enabled.store(activeNow,std::memory_order_relaxed);accessDeadline.set(monotonic()+std::max<juce::int64>(0,claims->expiry-clock.observed()));if(activeNow&&!cacheWritable){status(juce::String::fromUTF8("認証済み・保存失敗 / 診断をコピー"),"Activated, but cache save failed. Copy diagnostics.");}else if(activeNow){const auto hours=std::max<juce::int64>(1,(claims->expiry-clock.observed()+3599)/3600);status(juce::String::fromUTF8("無料体験：残り ")+juce::String(hours)+juce::String::fromUTF8(" 時間"),juce::String(hours)+" hours left in trial");}else if(clock.needsOnline())status(juce::String::fromUTF8("時刻を確認してください / 再ログイン"), "Check clock / sign in again");else status(juce::String::fromUTF8("無料体験期間が終了しました / 製品を購入"), "Trial expired / buy full version");if(wall()-lastSave>=30)save();}
juce::var Controller::post(juce::var data){
 if(transport)return transport(data);
 if(!endpoint.startsWith("https://")||!endpoint.endsWith("/functions/v1/zasu-trial")){record(Event::transportFailed);return body({{"error","transport_error"}});}
 auto stream=std::make_unique<juce::WebInputStream>(juce::URL(endpoint).withPOSTData(juce::JSON::toString(data,false)),true);
 stream->withConnectionTimeout(5000).withNumRedirectsToFollow(0).withExtraHeaders("Content-Type: application/json\r\n");
 auto* web=stream.get();{std::lock_guard<std::mutex> lock(streamMutex);currentStream=web;}
 struct StreamGuard {Controller& owner;~StreamGuard(){std::lock_guard<std::mutex> lock(owner.streamMutex);owner.currentStream=nullptr;}} guard{*this};
 RequestDeadline deadline([web]{web->cancel();},std::chrono::seconds(15));
 const auto connected=stream->connect(nullptr);const auto code=stream->getStatusCode();
 if(!connected||threadShouldExit()){record(Event::transportFailed,code);return body({{"error","transport_error"}});}
 record(code>=200&&code<300?Event::httpOk:Event::httpFailed,code);
 juce::MemoryOutputStream result;char bytes[1024];int n=0;
 while(!threadShouldExit()&&(n=stream->read(bytes,sizeof bytes))>0){if(result.getDataSize()+static_cast<size_t>(n)>16384){record(Event::responseInvalid,code);return body({{"error","invalid_response"}});}result.write(bytes,static_cast<size_t>(n));}
 juce::var parsed;const auto parse=juce::JSON::parse(result.toString(),parsed);
 if(parse.failed()||!parsed.isObject()||stream->isError()){record(Event::responseInvalid,code);return body({{"error","invalid_response"}});}
 if(code<200||code>=300){if(!parsed["error"].isString())return body({{"error","invalid_response"}});}return parsed;
}
void Controller::run(){restore();while(!threadShouldExit()){
 tick();if(!requested.exchange(false)){wait(250);continue;}
 struct ActivationGuard {std::atomic<bool>& value;~ActivationGuard(){value=false;}} activationGuard{activating};
 if(active())continue;
 record(Event::start);
 const auto secret=verifier();if(secret.isEmpty()){status(juce::String::fromUTF8("認証を開始できません。再試行してください。"),"Activation unavailable. Try again.");continue;}
 auto challenge=encodeUrl(juce::SHA256(secret.toRawUTF8(),static_cast<size_t>(secret.getNumBytesAsUTF8())).getRawData());
#if JUCE_MAC
 const juce::String platform="mac";
#else
 const juce::String platform="win";
#endif
 const auto response=post(body({{"action","begin"},{"product",product},{"platform",platform},{"challenge",challenge}}));
 const auto request=response["requestId"].toString();
 if(request.length()!=36){record(Event::responseInvalid);status(juce::String::fromUTF8("体験版の認証を開始できません。後で再試行してください。"),"Cannot start activation. Try again later.");continue;}
 {std::lock_guard<std::mutex> lock(mutex);browserUrl=juce::String(ZASU_TRIAL_ACCOUNT_URL)+"#trial_request="+request;}
 record(Event::browserReady);
 status(juce::String::fromUTF8("ブラウザでログインして開始を確認してください。"),"Sign in and confirm in your browser.");
 const auto deadline=monotonic()+600;while(!threadShouldExit()&&monotonic()<deadline){
  // Five-second polling with interruptible short waits and clock updates.
  for(int i=0;i<20&&!threadShouldExit();++i){tick();wait(250);}
  if(threadShouldExit())break;
  const auto requestStart=monotonic();const auto result=post(body({{"action","exchange"},{"requestId",request},{"verifier",secret}}));const auto state=result["state"].toString();
  if(state=="active"){
   auto token=result["license"].toString();record(Event::licenseReceived);VerificationFailure failure;auto checked=verify(token,product,modulus,&failure);if(!checked){
    const auto event=failure==VerificationFailure::format?Event::licenseFormatRejected:failure==VerificationFailure::header?Event::licenseHeaderRejected:failure==VerificationFailure::publicKey?Event::publicKeyRejected:failure==VerificationFailure::claims?Event::licenseClaimsRejected:Event::signatureRejected;record(event);status(juce::String::fromUTF8("ライセンスを確認できません。"),"License verification failed.");break;}
   record(Event::signatureVerified);license=token;claims=checked;clock.activate(claims->issued+monotonic()-requestStart,claims->expiry,wall(),monotonic());save();tick();record(Event::activated);break;
  }
  if(state=="purchased"){status(juce::String::fromUTF8("購入済みです。製品版をインストールしてください。"),"Purchased. Install your DRM-free full version.");break;}
  if(state=="expired"||state=="revoked"){enabled=false;status(juce::String::fromUTF8("無料体験期間が終了しました。"),"Trial expired.");break;}
  const auto error=result["error"].toString();
  if(error.isNotEmpty()){
   if(error=="transport_error"||error=="temporarily_unavailable"||error=="rate_limited"){record(error=="transport_error"?Event::transportFailed:error=="rate_limited"?Event::serverRateLimited:Event::serverUnavailable);status(juce::String::fromUTF8("通信を待っています。再ログインは不要です。"),"Waiting for connection. No new login needed.");continue;}
   record(error=="authentication_required"?Event::serverAuthRequired:error=="expired_request"?Event::serverRequestExpired:error=="not_available"?Event::serverNotAvailable:Event::serverRejected);status(juce::String::fromUTF8("認証を完了できません。診断をコピーしてください。"),"Activation stopped. Copy diagnostics.");break;
  }
  if(state=="pending"){record(Event::pending);continue;}
  record(Event::responseInvalid);status(juce::String::fromUTF8("認証応答を確認できません。診断をコピーしてください。"),"Invalid activation response. Copy diagnostics.");break;
 }
 if(!enabled&&monotonic()>=deadline){record(Event::timedOut);status(juce::String::fromUTF8("認証の時間切れです。再試行してください。"),"Activation timed out. Try again.");}
 }save();}
}
