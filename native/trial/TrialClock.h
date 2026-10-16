#pragma once
#include <algorithm>
#include <cstdint>
namespace zasu::trial {
// Control thread only. All times are whole seconds. No hardware identifiers.
class Clock {
 std::int64_t start=0,expiry=0,high=0,anchor=0,mono=0;bool issued=false,rollback=false;
public:
 void activate(std::int64_t server,std::int64_t end,std::int64_t wall,std::int64_t monotonic){
  start=server;expiry=end;high=server;anchor=server;mono=monotonic;issued=end>server;rollback=false;
  // Initial server time anchors the session even if the local clock is incorrect.
  offset=wall-server;
 }
 void restore(std::int64_t begin,std::int64_t end,std::int64_t observed,std::int64_t wall,std::int64_t monotonic){
  start=begin;expiry=end;high=std::max(begin,observed);anchor=std::max(wall,high);mono=monotonic;offset=0;issued=end>begin;rollback=wall+300<high;
 }
 bool active(std::int64_t wall,std::int64_t monotonic){
  const auto corrected=wall-offset;
  if(corrected+300<high||monotonic<mono)rollback=true;
  high=std::max({high,corrected,anchor+std::max<std::int64_t>(0,monotonic-mono)});
  return issued&&!rollback&&high>=start&&high<expiry;
 }
 std::int64_t observed()const{return high;}
 bool needsOnline()const{return rollback;}
private:std::int64_t offset=0;
};
}
