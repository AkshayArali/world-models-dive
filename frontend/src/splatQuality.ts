import type { WebGLRenderer } from "three";
import type { SparkRenderer } from "@sparkjsdev/spark";

export function createSplatQuality(renderer: WebGLRenderer, spark: SparkRenderer) {
  const defaultPixelRatio = Math.min(window.devicePixelRatio, 2);

  function apply(q: "low" | "medium" | "high" | undefined) {
    renderer.shadowMap.enabled = false;
    if (q === "low") {
      spark.enableLod = true;
      spark.lodSplatCount = 80000;
      spark.lodSplatScale = 0.5;
      renderer.setPixelRatio(1);
    } else if (q === "medium") {
      spark.enableLod = true;
      spark.lodSplatCount = 400000;
      spark.lodSplatScale = 0.8;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      spark.enableLod = true;
      spark.lodSplatCount = 800000;
      spark.lodSplatScale = 1.0;
      renderer.setPixelRatio(defaultPixelRatio);
    }
  }

  function restore() {
    spark.enableLod = true;
    spark.lodSplatCount = 800000;
    spark.lodSplatScale = 1.0;
    renderer.setPixelRatio(defaultPixelRatio);
    renderer.shadowMap.enabled = true;
  }

  return { apply, restore, defaultPixelRatio };
}
