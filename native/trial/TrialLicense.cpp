#include "TrialLicense.h"
namespace zasu::trial {
juce::String encodeUrl(const juce::MemoryBlock& b){return juce::Base64::toBase64(b.getData(),b.getSize()).replaceCharacter('+','-').replaceCharacter('/','_').removeCharacters("=");}
static bool decode(juce::String s,juce::MemoryBlock& out){
 if(s.isEmpty()||s.containsAnyOf(" \r\n\t+=/"))return false;
 for(auto c:s)if(!juce::CharacterFunctions::isLetterOrDigit(c)&&c!='-'&&c!='_')return false;
 if(s.length()%4==1)return false;
 auto value=s.replaceCharacter('-','+').replaceCharacter('_','/');while(value.length()%4)value+='=';
 juce::MemoryOutputStream stream;if(!juce::Base64::convertFromBase64(stream,value))return false;out=stream.getMemoryBlock();return encodeUrl(out)==s;
}
std::optional<License> verify(const juce::String& compact,const juce::String& product,const juce::String& modulusHex){
 if(compact.length()>4096||modulusHex.length()!=512||modulusHex.containsAnyOf(" \r\n"))return {};
 juce::StringArray parts;parts.addTokens(compact,".","");if(parts.size()!=3)return {};
 juce::MemoryBlock header,payload,sig;if(!decode(parts[0],header)||!decode(parts[1],payload)||!decode(parts[2],sig)||sig.getSize()!=256)return {};
 auto h=juce::JSON::parse(header.toString());if(h["alg"].toString()!="RS256"||h["typ"].toString()!="ZASU-TRIAL"||h["kid"].toString()!="zasu-trial-1")return {};
 juce::BigInteger modulus,exponent,value;modulus.parseString(modulusHex,16);exponent=65537;
 if(modulus.getHighestBit()!=2047)return {};
 juce::MemoryBlock reverse(sig);std::reverse(static_cast<char*>(reverse.getData()),static_cast<char*>(reverse.getData())+reverse.getSize());value.loadFromMemoryBlock(reverse);
 if(value.isZero()||value>=modulus)return {};value.exponentModulo(exponent,modulus);
 auto recovered=value.toMemoryBlock();if(recovered.getSize()>256)return {};
 std::array<unsigned char,256> em{};for(size_t i=0;i<recovered.getSize();++i)em[255-i]=static_cast<const unsigned char*>(recovered.getData())[i];
 auto message=(parts[0]+"."+parts[1]).toUTF8();auto digest=juce::SHA256(message.getAddress(),message.sizeInBytes()-1).getRawData();
 const unsigned char prefix[]={0x30,0x31,0x30,0x0d,0x06,0x09,0x60,0x86,0x48,0x01,0x65,0x03,0x04,0x02,0x01,0x05,0x00,0x04,0x20};
 std::array<unsigned char,256> expected{};expected[1]=1;std::fill(expected.begin()+2,expected.begin()+204,0xff);expected[204]=0;
 std::copy(std::begin(prefix),std::end(prefix),expected.begin()+205);std::memcpy(expected.data()+224,digest.getData(),32);
 unsigned different=0;for(size_t i=0;i<256;++i)different|=em[i]^expected[i];if(different)return {};
 auto c=juce::JSON::parse(payload.toString());if(c["iss"].toString()!="zasu-trial"||c["aud"].toString()!=product||c["kind"].toString()!="trial"||int(c["v"])!=1)return {};
 for(auto key:{"nbf","iat","exp"})if(!c[key].isInt()&&!c[key].isInt64())return {};
 License result{c["jti"].toString(),juce::int64(c["nbf"]),juce::int64(c["iat"]),juce::int64(c["exp"])};
 if(result.id.length()!=36||result.start<1||result.issued<result.start||result.expiry<=result.issued||result.expiry-result.start>2678400)return {};
 return result;
}
}
