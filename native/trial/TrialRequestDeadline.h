#pragma once
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <functional>
#include <mutex>
#include <thread>
namespace zasu::trial {
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
 template<class Duration>RequestDeadline(std::function<void()> cancel,Duration timeout):worker([this,cancel=std::move(cancel),timeout]{std::unique_lock<std::mutex> lock(mutex);if(!cv.wait_for(lock,timeout,[this]{return stopped;})){lock.unlock();cancel();}}){}
 ~RequestDeadline(){{std::lock_guard<std::mutex> lock(mutex);stopped=true;}cv.notify_one();worker.join();}
 RequestDeadline(const RequestDeadline&)=delete;RequestDeadline& operator=(const RequestDeadline&)=delete;
};
}
