#pragma once
#include <juce_cryptography/juce_cryptography.h>
#include <optional>
namespace zasu::trial {
struct License { juce::String id;juce::int64 start=0,issued=0,expiry=0; };
std::optional<License> verify(const juce::String& compact,const juce::String& product,const juce::String& modulusHex);
juce::String encodeUrl(const juce::MemoryBlock&);
}
