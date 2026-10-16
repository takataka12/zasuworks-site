#pragma once
#include "TrialClock.h"
#include "TrialRequestDeadline.h"
#include "TrialLicense.h"
#include <atomic>
#include <mutex>
#include <vector>
namespace zasu::trial {
class Controller final:private juce::Thread {
public:
 using Transport=std::function<juce::var(const juce::var&)>;
 Controller(juce::String product,juce::String publicModulus,juce::String endpoint,Transport transport={},juce::File cacheFile={});
 ~Controller()override;
 bool active()const noexcept{return enabled.load(std::memory_order_relaxed)&&accessDeadline.active(static_cast<juce::int64>(juce::Time::getMillisecondCounterHiRes()/1000));}
 bool busy()const noexcept{return activating.load();}
 juce::String diagnosticReport()const;
 void browserLaunchResult(bool opened);
 void begin(); // UI thread only; network work happens on worker.
 juce::String text(bool english=false)const;
 juce::String takeBrowserUrl(); // UI thread launches the system browser.
private:
 void run()override;void restore();bool save();void tick();juce::var post(juce::var);
 enum class Event {cacheMissing,cacheRestored,cacheRejected,start,browserReady,browserOpened,browserFailed,httpOk,httpFailed,transportFailed,responseInvalid,licenseReceived,signatureRejected,signatureVerified,cacheSaved,cacheWriteFailed,activated,pending,serverRejected,timedOut,licenseFormatRejected,licenseHeaderRejected,publicKeyRejected,licenseClaimsRejected,serverAuthRequired,serverRequestExpired,serverUnavailable,serverRateLimited,serverNotAvailable};
 void record(Event event,int httpStatus=0);
 void status(juce::String ja,juce::String en);
 const juce::String product,modulus,endpoint;
 juce::File cache;
 const Transport transport;
 struct Diagnostic {Event event;int status;};
 std::vector<Diagnostic> diagnostics;
 bool cacheWritable=true;
 std::atomic<bool> enabled{false},requested{false},activating{false};
 mutable std::mutex mutex;
 juce::String japanese=juce::String::fromUTF8("7日間無料体験 / ログイン"),english="Start 7-day free trial",browserUrl,license;
 AccessDeadline accessDeadline;std::mutex streamMutex;juce::WebInputStream* currentStream=nullptr;
 Clock clock;std::optional<License> claims;juce::int64 lastSave=0;
};
}
