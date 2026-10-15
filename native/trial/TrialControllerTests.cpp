#include "TrialController.h"
#include <atomic>
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <stdexcept>
#include <thread>
using namespace zasu::trial;
static void require(bool v,const char* message){if(!v)throw std::runtime_error(message);}
static juce::var object(const juce::String& json){return juce::JSON::parse(json);}
template<class Predicate> static bool until(Predicate predicate,int ms=7500){const auto end=std::chrono::steady_clock::now()+std::chrono::milliseconds(ms);while(std::chrono::steady_clock::now()<end){if(predicate())return true;std::this_thread::sleep_for(std::chrono::milliseconds(10));}return predicate();}
struct Temp {juce::File dir=juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("zasu-controller-"+juce::Uuid().toString());~Temp(){dir.deleteRecursively();}};
int main(int argc,char** argv){try{
 require(argc==2,"fixture required");auto fixture=juce::JSON::parse(juce::File(argv[1]));const auto token=fixture["license"].toString(),modulus=fixture["modulus"].toString();
 Temp temp;std::atomic<int> begins{0};std::mutex mutex;std::condition_variable cv;bool released=false;
 {
 Controller c("vocal",modulus,"https://example.invalid/functions/v1/zasu-trial",[&](const juce::var& request){
  if(request["action"].toString()=="begin") {++begins;std::unique_lock<std::mutex> lock(mutex);cv.wait(lock,[&]{return released;});return object(R"({"requestId":"11111111-aaaa-4111-8111-111111111111"})");}
  return object(R"({"state":"active","license":"invalid.DO_NOT_LOG_THIS_SECRET.signature"})");
 },temp.dir.getChildFile("invalid.json"));
 c.begin();require(until([&]{return begins.load()==1;}),"first begin not sent");
 c.begin();c.begin();{std::lock_guard<std::mutex> lock(mutex);released=true;}cv.notify_all();
 const bool failed=until([&]{return c.text(true).contains("verification failed");});
 require(failed&&begins.load()==1,"duplicate begin overwrote the signature failure or issued a second request");
 require(!c.active(),"invalid license enabled DSP");
 const auto report=c.diagnosticReport();require(report.contains("license_received")&&report.contains("license_format_rejected"),"missing verification diagnostics");require(!report.contains("DO_NOT_LOG_THIS_SECRET")&&!report.contains("11111111-aaaa")&&!report.contains(token),"diagnostic leaked credentials");require(!temp.dir.getChildFile("invalid.json").existsAsFile(),"invalid license was cached");
 }
 std::cout<<"PASS duplicate clicks preserve signature failure and send one activation request\n";
 // Exercise the real controller, signature verifier and atomic cache, with only HTTP replaced.
 std::atomic<int> calls{0};const auto validCache=temp.dir.getChildFile("valid.json");
 auto validTransport=[&](const juce::var& request){++calls;auto* response=new juce::DynamicObject;if(request["action"].toString()=="begin")response->setProperty("requestId","22222222-aaaa-4222-8222-222222222222");else{response->setProperty("state","active");response->setProperty("license",token);}return juce::var(response);};
 {Controller c("vocal",modulus,"https://example.invalid/functions/v1/zasu-trial",validTransport,validCache);c.begin();require(until([&]{return c.active();}),"valid signed license did not activate");require(validCache.existsAsFile(),"successful activation not persisted");require(c.diagnosticReport().contains("signature_verified"),"missing signature success stage");const auto before=calls.load();c.begin();std::this_thread::sleep_for(std::chrono::milliseconds(350));require(calls.load()==before,"active trial initiated another login");}
 {Controller c("vocal",modulus,"https://example.invalid/functions/v1/zasu-trial",[&](const juce::var&){throw std::runtime_error("offline restore contacted network");return juce::var();},validCache);require(until([&]{return c.active();},1000),"offline cache restore failed");require(c.diagnosticReport().contains("cache_restored"),"cache restore not diagnosed");}
 std::cout<<"PASS signed license receipt, activation, atomic save, offline restart, active-click guard\n";
 // A transient outage must recover without requesting a second browser authorization.
 int polls=0;const auto recoveredCache=temp.dir.getChildFile("recovered.json");
 {Controller c("vocal",modulus,"https://example.invalid/functions/v1/zasu-trial",[&](const juce::var& request){if(request["action"].toString()=="exchange"&&++polls==1)return object(R"({"error":"transport_error"})");return validTransport(request);},recoveredCache);c.begin();require(until([&]{return c.active();},12500),"transient network failure did not recover");require(polls==2,"unexpected exchange retries");}
 std::cout<<"PASS transient exchange failure recovers with original request\n";
 // Cache failure must stay visible rather than silently promising offline access.
 const auto blocker=temp.dir.getChildFile("not-a-directory");require(blocker.replaceWithText("file"),"test fixture write failed");
 {Controller c("vocal",modulus,"https://example.invalid/functions/v1/zasu-trial",validTransport,blocker.getChildFile("cache.json"));c.begin();require(until([&]{return c.active();}),"cache error prevented in-memory activation");require(until([&]{return c.text(true).contains("cache save failed");},1000),"cache failure hidden by remaining-time display");require(c.diagnosticReport().contains("cache_write_failed"),"missing cache failure stage");}
 std::cout<<"PASS cache failure classified and remains visible\n";
 return 0;
 }catch(const std::exception& e){std::cerr<<"FAIL: "<<e.what()<<'\n';return 1;}}
