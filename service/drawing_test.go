package service

import "testing"

func TestSupportsResponsesImageGenerationModelName(t *testing.T) {
	testCases := []struct {
		name     string
		model    string
		expected bool
	}{
		{name: "gpt 5.4", model: "gpt-5.4", expected: true},
		{name: "gpt 5 mini", model: "gpt-5-mini", expected: true},
		{name: "gpt 4o", model: "gpt-4o-mini", expected: true},
		{name: "gpt 4.1", model: "gpt-4.1", expected: true},
		{name: "chatgpt 4o", model: "chatgpt-4o-latest", expected: true},
		{name: "gpt image api model", model: "gpt-image-1", expected: false},
		{name: "gpt image 2", model: "gpt-image-2", expected: false},
		{name: "gemini", model: "gemini-2.5-flash-image-preview", expected: false},
		{name: "empty", model: "", expected: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			actual := supportsResponsesImageGenerationModelName(testCase.model)
			if actual != testCase.expected {
				t.Fatalf("expected %v, got %v for model %q", testCase.expected, actual, testCase.model)
			}
		})
	}
}

func TestSupportsOpenAIImageEditModelName(t *testing.T) {
	testCases := []struct {
		name     string
		model    string
		expected bool
	}{
		{name: "gpt image 1", model: "gpt-image-1", expected: true},
		{name: "gpt image 2", model: "gpt-image-2", expected: true},
		{name: "gpt image 1.5", model: "gpt-image-1.5", expected: true},
		{name: "chatgpt image latest", model: "chatgpt-image-latest", expected: true},
		{name: "gpt 4o", model: "gpt-4o", expected: false},
		{name: "gemini", model: "gemini-2.5-flash-image-preview", expected: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			actual := supportsOpenAIImageEditModelName(testCase.model)
			if actual != testCase.expected {
				t.Fatalf("expected %v, got %v for model %q", testCase.expected, actual, testCase.model)
			}
		})
	}
}
