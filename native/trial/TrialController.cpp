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
Controller::Controller(juce::String p,juce::String m,juce::String e):Thread("ZASU Trial"),product(p),modulus(m),endpoint(e){
 cache=juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory).getChildFile("ZASU WORKS/Trial").getChildFile(product+".json");startThread();
}
Controller::~Controller(){signalThreadShouldExit();notify();{std::lock_guard<std::mutex> lock(streamMutex);if(currentStream)currentStream->cancel();}stopThread(-1);}
void Controller::status(juce::String ja,juce::String en){std::lock_guard<std::mutex> lock(mutex);japanese=std::move(ja);english=std::move(en);}
juce::String Controller::text(bool en)const{std::lock_guard<std::mutex> lock(mutex);return en?english:japanese;}
juce::String Controller::takeBrowserUrl(){std::lock_guard<std::mutex> lock(mutex);auto u=browserUrl;browserUrl.clear();return u;}
void Controller::begin(){requested=true;notify();}
void Controller::restore(){if(cache.getSize()>8192)return;auto c=juce::JSON::parse(cache);license=c["license"].toString();claims=verify(license,product,modulus);if(claims){clock.restore(claims->start,claims->expiry,std::max(claims->issued,juce::int64(c["observed"])),wall(),monotonic());tick();}else license.clear();}
void Controller::save(){if(!claims)return;if(!cache.getParentDirectory().createDirectory())return;juce::TemporaryFile temp(cache);auto data=body({{"license",license},{"observed",juce::int64(clock.observed())}});if(temp.getFile().replaceWithText(juce::JSON::toString(data,false))){temp.getFile().setReadOnly(false);
#if !JUCE_WINDOWS
 temp.getFile().setExecutePermission(false);
#endif
 temp.overwriteTargetFileWithTemporary();}lastSave=wall();}
void Controller::tick(){if(!claims)return;auto activeNow=clock.active(wall(),monotonic());enabled.store(activeNow,std::memory_order_relaxed);accessDeadline.set(monotonic()+std::max<juce::int64>(0,claims->expiry-clock.observed()));if(activeNow){const auto hours=std::max<juce::int64>(1,(claims->expiry-clock.observed()+3599)/3600);status(juce::String::fromUTF8("無料体験：残り ")+juce::String(hours)+juce::String::fromUTF8(" 時間"),juce::String(hours)+" hours left in trial");}else if(clock.needsOnline())status(juce::String::fromUTF8("時刻を確認してください / 再ログイン"), "Check clock / sign in again");else status(juce::String::fromUTF8("無料体験期間が終了しました / 製品を購入"), "Trial expired / buy full version");if(wall()-lastSave>=30)save();}
juce::var Controller::post(juce::var data){
 // Compile-time TLS endpoint. No redirects, credentials, raw error logs or retries on audio thread.
 if(!endpoint.startsWith("https://")||!endpoint.endsWith("/functions/v1/zasu-trial"))return {};
 auto options=juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData).withConnectionTimeoutMs(5000).withNumRedirectsToFollow(0).withExtraHeaders("Content-Type: application/json\r\n");
 auto stream=juce::URL(endpoint).withPOSTData(juce::JSON::toString(data,false)).createInputStream(options);if(!stream||threadShouldExit())return {};
 auto* web=dynamic_cast<juce::WebInputStream*>(stream.get());if(!web)return {};
 {std::lock_guard<std::mutex> lock(streamMutex);currentStream=web;}
 struct StreamGuard {Controller& owner;~StreamGuard(){std::lock_guard<std::mutex> lock(owner.streamMutex);owner.currentStream=nullptr;}} guard{*this};
 RequestDeadline deadline([web]{web->cancel();},std::chrono::seconds(15));
 juce::MemoryOutputStream result;char bytes[1024];int n;while(!threadShouldExit()&&(n=stream->read(bytes,sizeof bytes))>0){if(result.getDataSize()+static_cast<size_t>(n)>16384)return {};result.write(bytes,static_cast<size_t>(n));}
 return juce::JSON::parse(result.toString());
}
void Controller::run(){restore();while(!threadShouldExit()){
 tick();if(!requested.exchange(false)){wait(250);continue;}
 const auto secret=verifier();if(secret.isEmpty()){status(juce::String::fromUTF8("認証を開始できません。再試行してください。"),"Activation unavailable. Try again.");continue;}
 auto challenge=encodeUrl(juce::SHA256(secret.toRawUTF8(),static_cast<size_t>(secret.getNumBytesAsUTF8())).getRawData());
#if JUCE_MAC
 const juce::String platform="mac";
#else
 const juce::String platform="win";
#endif
 const auto response=post(body({{"action","begin"},{"product",product},{"platform",platform},{"challenge",challenge}}));
 const auto request=response["requestId"].toString();
 if(request.length()!=36){status(juce::String::fromUTF8("体験版の認証を開始できません。後で再試行してください。"),"Cannot start activation. Try again later.");continue;}
 {std::lock_guard<std::mutex> lock(mutex);browserUrl=juce::String(ZASU_TRIAL_ACCOUNT_URL)+"#trial_request="+request;}
 status(juce::String::fromUTF8("ブラウザでログインして開始を確認してください。"),"Sign in and confirm in your browser.");
 const auto deadline=monotonic()+600;while(!threadShouldExit()&&monotonic()<deadline){
  // Five-second polling with interruptible short waits and clock updates.
  for(int i=0;i<20&&!threadShouldExit();++i){tick();wait(250);}
  if(threadShouldExit())break;
  const auto requestStart=monotonic();const auto result=post(body({{"action","exchange"},{"requestId",request},{"verifier",secret}}));const auto state=result["state"].toString();
  if(state=="active"){
   auto token=result["license"].toString();auto checked=verify(token,product,modulus);if(!checked){status(juce::String::fromUTF8("ライセンスを確認できません。"),"License verification failed.");break;}
   license=token;claims=checked;clock.activate(claims->issued+monotonic()-requestStart,claims->expiry,wall(),monotonic());save();tick();break;
  }
  if(state=="purchased"){status(juce::String::fromUTF8("購入済みです。製品版をインストールしてください。"),"Purchased. Install your DRM-free full version.");break;}
  if(state=="expired"||state=="revoked"){enabled=false;status(juce::String::fromUTF8("無料体験期間が終了しました。"),"Trial expired.");break;}
  if(result["error"].toString()=="expired_request"||result["error"].toString()=="authentication_required"){status(juce::String::fromUTF8("認証が終了しました。再度ログインしてください。"),"Activation expired. Sign in again.");break;}
 }
 if(!enabled&&monotonic()>=deadline)status(juce::String::fromUTF8("認証の時間切れです。再試行してください。"),"Activation timed out. Try again.");
 }save();}
}
