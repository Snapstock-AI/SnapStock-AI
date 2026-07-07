import CameraCapture from "../components/CameraCapture";

function Home() {
  return (
    <div>
      <h1>
        SnapStock AI
      </h1>

      <p>
        Capture fruit images and check freshness
      </p>

      <CameraCapture />
    </div>
  );
}

export default Home;