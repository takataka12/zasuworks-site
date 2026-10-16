#include "TrialClock.h"
#include <iostream>
#include <stdexcept>
static void require(bool value,const char* message){if(!value)throw std::runtime_error(message);}
int main(){using zasu::trial::Clock;int passed=0;
 auto restored=[&](long observed,long wall,bool expected,const char* name){Clock c;c.restore(1000,605800,observed,wall,0);require(c.active(wall,0)==expected,name);require(!c.needsOnline(),"normal expiry misclassified as rollback");++passed;std::cout<<"PASS "<<name<<"\n";};
 restored(605700,605799,true,"restart one second before deadline remains active");
 restored(605700,605800,false,"restart exactly at expiry is inactive");
 restored(605700,605801,false,"restart after expiry is inactive");
 restored(605800,605799,false,"persisted expiry cannot be undone by small wall rollback");
 Clock frozen;frozen.restore(1000,605800,605799,605799,0);require(frozen.active(605799,0),"initial cached active");require(!frozen.active(605799,1),"monotonic deadline on restored cache");++passed;std::cout<<"PASS restored cache expires with frozen wall time\n";
 Clock rollback;rollback.restore(1000,605800,605700,605000,0);require(!rollback.active(605000,0)&&rollback.needsOnline(),"rollback fail closed");++passed;std::cout<<"PASS large rollback stays inactive and classified separately\n";
 std::cout<<passed<<"/6 isolated clock probes passed; no network, OS clock or user cache modified\n";
}
