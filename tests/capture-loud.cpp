#include "PluginEditor.h"
// Captures the unmodified v1.1.2 editor. This is not a macOS host test.
int main(int argc, char** argv)
{
    if (argc != 2) return 2;
    juce::ScopedJuceInitialiser_GUI init;
    ZASULOUDProcessor processor;
    ZASULOUDProcessorEditor editor(processor);
    editor.resized();
    auto image = editor.createComponentSnapshot(editor.getLocalBounds(), true, 2.0f);
    juce::MemoryOutputStream png;
    if (!juce::PNGImageFormat().writeImageToStream(image, png)) return 3;
    return juce::File(argv[1]).replaceWithData(png.getData(), png.getDataSize()) ? 0 : 4;
}
