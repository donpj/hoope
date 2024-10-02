import dynamic from "next/dynamic";

const DynamicCarousel = dynamic(
  () => import("react-native-reanimated-carousel").then((mod) => mod.default),
  {
    ssr: false,
  }
);

export default DynamicCarousel;
