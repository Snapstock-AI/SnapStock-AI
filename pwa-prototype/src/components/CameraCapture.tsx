import { useState } from "react";

function CameraCapture() {
  const [image, setImage] = useState<string | null>(null);

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    }
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
        </div>
      )}
    </div>
  );
}

export default CameraCapture;