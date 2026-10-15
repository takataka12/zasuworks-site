#pragma once
#include "TrialClock.h"
#include "TrialRequestDeadline.h"
#include "TrialLicense.h"
#include <atomic>
#include <mutex>
namespace zasu::trial {
class Controller final:private juce::Thread {
public:
 Controller(juce::String product,juce::String publicModulus,juce::String endpoint);
 ~Controller()override;
 bool active()const noexcept{return enabled.load(std::memory_order_relaxed)&&accessDeadline.active(static_cast<juce::int64>(juce::Time::getMillisecondCounterHiRes()/1000));}
 void begin(); // UI thread only; network work happens on worker.
 juce::String text(bool english=false)const;
 juce::String takeBrowserUrl(); // UI thread launches the system browser.
private:
 void run()override;void restore();void save();void tick();juce::var post(juce::var);
 void status(juce::String ja,juce::String en);
 const juce::String product,modulus,endpoint;
 juce::File cache;
 std::atomic<bool> enabled{false},requested{false};
 mutable std::mutex mutex;
 juce::String japanese=juce::String::fromUTF8("7日間無料体験 / ログイン"),english="Start 7-day free trial",browserUrl,license;
 AccessDeadline accessDeadline;std::mutex streamMutex;juce::WebInputStream* currentStream=nullptr;
 Clock clock;std::optional<License> claims;juce::int64 lastSave=0;
};
}
