#pragma once
#include <atomic>
#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <functional>
#include <mutex>
#include <thread>
namespace zasu::trial {
// Keep polling waits interruptible while the controller updates its local clock.
template<class Stop,class Tick,class Wait,class Now>
void waitForTrialPoll(Stop stop,Tick tick,Wait wait,Now now){
 // Relative sleeps accumulate scheduler overshoot (and notifications can shorten them).
 // A steady deadline preserves the polling interval without changing activation/HTTP timeouts.
 const auto deadline=now()+std::chrono::seconds(5);
 while(!stop()){
  tick();
  const auto remaining=std::chrono::duration<double,std::milli>(deadline-now()).count();
  if(remaining<=0)return;
  wait((std::min)(250.0,remaining));
 }
}
class AccessDeadline {
 std::atomic<std::int64_t> end{0};
public:
 void set(std::int64_t value)noexcept{end.store(value,std::memory_order_relaxed);}
 bool active(std::int64_t now)const noexcept{return now<end.load(std::memory_order_relaxed);}
};
// Control thread only. Destruction joins before the referenced stream is destroyed.
class RequestDeadline {
 std::mutex mutex;std::condition_variable cv;bool stopped=false;std::thread worker;
public:
 // Capture the deadline before launch: delayed worker scheduling must not add
 // another full relative timeout to an already running HTTP request.
 template<class Duration>RequestDeadline(std::function<void()> cancel,Duration timeout):worker([this,cancel=std::move(cancel),expires=std::chrono::steady_clock::now()+timeout]{std::unique_lock<std::mutex> lock(mutex);if(!cv.wait_until(lock,expires,[this]{return stopped;})){lock.unlock();cancel();}}){}
 ~RequestDeadline(){{std::lock_guard<std::mutex> lock(mutex);stopped=true;}cv.notify_one();worker.join();}
 RequestDeadline(const RequestDeadline&)=delete;RequestDeadline& operator=(const RequestDeadline&)=delete;
};
}
