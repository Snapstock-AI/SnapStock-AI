import { useState } from "react";

function CameraCapture() {
  const [image, setImage] = useState<string | null>(null);

  const [result, setResult] = useState<{
    fruit: string;
    freshness: string;
    confidence: number;
  } | null>(null);


  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);

      setImage(imageUrl);

      // Clear previous result when new image selected
      setResult(null);
    }
  };


  const analyzeImage = () => {

    // Temporary dummy AI response
    const dummyResult = {
      fruit: "Apple",
      freshness: "Good",
      confidence: 0.97
    };

    setResult(dummyResult);
  };


  return (
    <div>

      <h2>Scan Fruit</h2>


      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
      />


      {image && (
        <div>

          <h3>Preview</h3>

          <img
            src={image}
            alt="Captured fruit"
            width="300"
          />


          <br />


          <button onClick={analyzeImage}>
            Analyze
          </button>

        </div>
      )}



      {result && (
        <div>

          <h2>AI Result</h2>

          <p>
            Fruit: {result.fruit}
          </p>

          <p>
            Freshness: {result.freshness}
          </p>

          <p>
            Confidence:
            {" "}
            {(result.confidence * 100).toFixed(2)}%
          </p>

        </div>
      )}

    </div>
  );
}

export default CameraCapture;