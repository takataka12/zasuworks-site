#include "TrialRequestDeadline.h"
#include <atomic>
#include <cassert>
#include <chrono>
#include <thread>
#include <iostream>
#include <stdexcept>
#include <future>
#include <memory>
static void check(bool value,const char* message){if(!value)throw std::runtime_error(message);}
static void pollingSchedule(){
 using namespace zasu::trial;using namespace std::chrono;
 steady_clock::time_point time{};const auto origin=time;int ticks=0;
 // The OS resumes every timed wait 100ms late. Exercise the production polling wait.
 waitForTrialPoll([]{return false;},[&]{++ticks;},[&](double ms){time+=duration_cast<steady_clock::duration>(duration<double,std::milli>(ms))+milliseconds(100);},[&]{return time;});
 const auto elapsed=duration_cast<milliseconds>(time-origin).count();
 std::cout<<"scheduler_delay_poll_ms="<<elapsed<<std::endl;
 check(elapsed>=5000&&elapsed<=5101,"poll interval accumulated scheduler delay");
 check(ticks>0,"polling wait stopped clock updates");
 // An early notification must not shorten the five-second interval.
 time=origin;int waits=0;
 waitForTrialPoll([]{return false;},[]{},[&](double ms){if(++waits==1)return;time+=duration_cast<steady_clock::duration>(duration<double,std::milli>(ms));},[&]{return time;});
 check(duration_cast<milliseconds>(time-origin).count()==5000,"notification shortened polling interval");
 time=origin;bool stopped=false;
 waitForTrialPoll([&]{return stopped;},[]{},[&](double){stopped=true;},[&]{return time;});
 check(time==origin&&stopped,"polling cancellation did not interrupt wait");
 std::cout<<"PASS polling deadline, delayed scheduling, early notification and cancellation\n";
}
static void watchdogLifecycle(){
 using namespace zasu::trial;using namespace std::chrono;
 // Synchronize on the callback, not a guess about when a new OS thread runs.
 std::promise<void> cancelled;auto completion=cancelled.get_future();
 {RequestDeadline deadline([&]{cancelled.set_value();},milliseconds(20));
  check(completion.wait_for(seconds(2))==std::future_status::ready,"request watchdog did not cancel");}
 std::atomic<int> unexpected{0};
 {RequestDeadline deadline([&]{++unexpected;},hours(1));}
 check(unexpected==0,"destroyed watchdog invoked cancellation");
 // Destruction must join an already executing callback before references die.
 std::promise<void> entered,release;auto started=entered.get_future();
 auto permit=release.get_future().share();std::atomic<bool> callbackFinished{false};
 auto deadline=std::make_unique<RequestDeadline>([&]{entered.set_value();permit.wait();callbackFinished=true;},milliseconds(1));
 if(started.wait_for(seconds(2))!=std::future_status::ready){release.set_value();deadline.reset();check(false,"watchdog callback did not start");}
 std::promise<void> destroying;auto destructionStarted=destroying.get_future();
 auto destruction=std::async(std::launch::async,[&]{destroying.set_value();deadline.reset();return callbackFinished.load();});
 const bool began=destructionStarted.wait_for(seconds(2))==std::future_status::ready;
 const bool blocked=began&&destruction.wait_for(milliseconds(20))==std::future_status::timeout;
 release.set_value();
 const bool joined=destruction.wait_for(seconds(2))==std::future_status::ready;
 check(began&&blocked&&joined&&destruction.get(),"watchdog destruction did not join callback");
 std::cout<<"PASS request watchdog completion, early destruction and callback join\n";
}
int main(){pollingSchedule();watchdogLifecycle();zasu::trial::AccessDeadline access;access.set(100);check(access.active(99),"access expired early");check(!access.active(100),"access allowed at expiry");check(!access.active(101),"access allowed after expiry");}
