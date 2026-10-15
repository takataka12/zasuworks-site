#pragma once
#include <algorithm>
namespace zasu::trial {
// Audio thread only. Caller supplies preallocated latency-aligned dry samples.
class Fade {
 float wet=0,step=1;
public:
 void prepare(double rate,bool enabled){wet=enabled?1.f:0.f;step=1.f/static_cast<float>(std::max(1.,rate*.05));}
 bool fullyDry()const{return wet<=0;}
 void process(float*const* output,const float*const* dry,int channels,int count,bool enabled)noexcept{
  for(int i=0;i<count;++i){wet=enabled?std::min(1.f,wet+step):std::max(0.f,wet-step);
   for(int ch=0;ch<channels;++ch)output[ch][i]=wet*output[ch][i]+(1-wet)*dry[ch][i];
  }
 }
};
}
