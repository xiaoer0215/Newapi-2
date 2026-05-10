package common

import "testing"

func TestIsImageGenerationModel(t *testing.T) {
	testCases := []struct {
		name     string
		model    string
		expected bool
	}{
		{name: "gpt image 1", model: "gpt-image-1", expected: true},
		{name: "gpt image 2", model: "gpt-image-2", expected: true},
		{name: "chatgpt image latest", model: "chatgpt-image-latest", expected: true},
		{name: "imagen", model: "imagen-3.0-generate-002", expected: true},
		{name: "text model", model: "gpt-4.1", expected: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			actual := IsImageGenerationModel(testCase.model)
			if actual != testCase.expected {
				t.Fatalf("expected %v, got %v for model %q", testCase.expected, actual, testCase.model)
			}
		})
	}
}
