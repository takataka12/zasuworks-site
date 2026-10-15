#include "TrialRequestDeadline.h"
#include <atomic>
#include <cassert>
#include <chrono>
#include <thread>
#include <iostream>
#include <stdexcept>
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
int main(){pollingSchedule();std::atomic<bool> cancelled{false};{zasu::trial::RequestDeadline deadline([&]{cancelled=true;},std::chrono::milliseconds(20));std::this_thread::sleep_for(std::chrono::milliseconds(80));assert(cancelled);}cancelled=false;{zasu::trial::RequestDeadline deadline([&]{cancelled=true;},std::chrono::seconds(1));}assert(!cancelled);zasu::trial::AccessDeadline access;access.set(100);assert(access.active(99));assert(!access.active(100));assert(!access.active(101));}
