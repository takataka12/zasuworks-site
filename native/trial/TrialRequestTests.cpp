#include "TrialRequestDeadline.h"
#include <atomic>
#include <cassert>
#include <chrono>
#include <thread>
int main(){std::atomic<bool> cancelled{false};{zasu::trial::RequestDeadline deadline([&]{cancelled=true;},std::chrono::milliseconds(20));std::this_thread::sleep_for(std::chrono::milliseconds(80));assert(cancelled);}cancelled=false;{zasu::trial::RequestDeadline deadline([&]{cancelled=true;},std::chrono::seconds(1));}assert(!cancelled);zasu::trial::AccessDeadline access;access.set(100);assert(access.active(99));assert(!access.active(100));assert(!access.active(101));}
