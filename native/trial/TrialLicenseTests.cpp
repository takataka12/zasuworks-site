#include "TrialLicense.h"
#include <cassert>
#include <iostream>
int main(int argc,char**argv){assert(argc==2);auto fixture=juce::JSON::parse(juce::File(argv[1]));const auto token=fixture["license"].toString(),modulus=fixture["modulus"].toString();
 auto c=zasu::trial::verify(token,"vocal",modulus);assert(c);assert(c->expiry-c->start==604800);assert(!zasu::trial::verify(token,"loud",modulus));assert(!zasu::trial::verify(token+"x","vocal",modulus));assert(!zasu::trial::verify(token,"vocal",juce::String::repeatedString("f",512)));zasu::trial::VerificationFailure failure;
 assert(!zasu::trial::verify("invalid.token.signature","vocal",modulus,&failure));assert(failure==zasu::trial::VerificationFailure::format);
 assert(!zasu::trial::verify(token,"loud",modulus,&failure));assert(failure==zasu::trial::VerificationFailure::claims);
 assert(!zasu::trial::verify(token,"vocal",juce::String::repeatedString("f",512),&failure));assert(failure==zasu::trial::VerificationFailure::signature);
 assert(zasu::trial::verify(token,"vocal",modulus,&failure));assert(failure==zasu::trial::VerificationFailure::none);
 std::cout<<"PASS: WebCrypto RS256 -> JUCE verification, wrong product, tamper, wrong key\n";}
