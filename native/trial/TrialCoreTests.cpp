#include "TrialClock.h"
#include "TrialFade.h"
#include <cassert>
#include <cmath>
#include <iostream>
int main(){using namespace zasu::trial;
 Clock c;assert(!c.active(1000,0));c.activate(1000,605800,1000,0);assert(c.active(1000,0));assert(c.active(605799,604799));assert(!c.active(605800,604800));
 c.activate(1000,605800,1000,0);assert(c.active(1000,100));assert(!c.active(600,101));
 c.activate(1000,605800,1000,0);assert(!c.active(1000,604800)); // monotonic time prevents frozen wall clock
 c.restore(1000,605800,5000,1000,0);assert(!c.active(1000,0)); // persisted rollback
 c.restore(1000,605800,5000,5000,0);assert(c.active(5000,0));
 Fade fade;fade.prepare(1000,false);float dry[100],wet[100];for(int i=0;i<100;i++){dry[i]=.25f;wet[i]=1;}
 const float* d[]={dry};float* w[]={wet};fade.process(w,d,1,100,true);assert(std::abs(wet[99]-1)<1e-6);
 for(auto &x:wet)x=1;fade.process(w,d,1,100,false);assert(wet[0]>.25f);assert(std::abs(wet[99]-.25f)<1e-6);for(int i=1;i<100;i++)assert(wet[i-1]>=wet[i]);
 for(auto &x:wet)x=1;fade.process(w,d,1,100,false);for(auto x:wet)assert(x==.25f);
 std::cout<<"PASS: 168-hour boundaries, monotonic time, clock rollback, cache restore, continuous dry/wet fade\n";
}
