import { ib, type LineageDataType } from "infinibrowser";

import { tryCatch } from "#lib/try-catch";
import { type UriDecodedString, UriEncodeString } from "#lib/typed-strings";

import { getGitlabFileData, saveToCloud, fetchLineageList } from "./gitlab";
import { validateLineageCraftingOrder } from "./validation";

type Data = { OK: false; error: string } | { OK: true; message: string };

function makeResponse(
  status: 200 | 400 | 405 | 500,
  message: string,
): { data?: Data; info: ResponseInit } {
  const headers = new Headers();

  if (status === 200) {
    headers.set("Content-Type", "application/json");
    return {
      data: { OK: true, message },
      info: { status, headers },
    };
  }

  return {
    data: { OK: false, error: message },
    info: { status, headers },
  };
}

function getLineageData(lineage: LineageDataType): {
  stepCount: number;
  resultItemId: UriDecodedString;
} {
  const stepCount = lineage.steps.length;
  const lastStep = lineage.steps[stepCount - 1]!;
  const resultItemId = lastStep.result.id as UriDecodedString;
  return { stepCount, resultItemId };
}

export async function handleLineageSubmit(
  request: Request,
  url: URL,
  env: Env,
): Promise<{
  data?: Data;
  info?: ResponseInit;
}> {
  if (request.method !== "POST") {
    return makeResponse(405, "Method Not Allowed");
  }

  // Handle missing id param
  const submittedLineageId = url.searchParams.get("id");

  if (!submittedLineageId) {
    return makeResponse(400, "Bad Request. Missing lineage `id` param.");
  }

  // Failed to get submitted lineage
  const submittedLineage = await ib.getCustomLineage(submittedLineageId);

  if (!submittedLineage.ok) {
    if (
      submittedLineage.error_code === "NOT_OK" ||
      submittedLineage.error_code === "UNKNOWN_ERROR"
    ) {
      return makeResponse(500, "Error fetching submitted lineage");
    }
    const error_message = `Error fetching submitted lineage: ${submittedLineage.error.message}`;
    return makeResponse(500, error_message);
  }

  // Handle invalid submittedLineageId
  const submittedLineageData = getLineageData(submittedLineage.data);

  // Handle failing to fetch infinibrowser lineage
  const resultItemId = submittedLineageData.resultItemId;

  const infinibrowserLineage = await ib.getLineage(resultItemId);

  if (!infinibrowserLineage.ok) {
    return makeResponse(500, "Failed to fetch infinibrowser lineage");
  }

  const submittedStepsCount = submittedLineageData.stepCount;

  // Reject if submitted lineage has 10 or fewer steps - PROBABLY TEMPORARY
  if (submittedStepsCount <= 10) {
    return makeResponse(400, "Submitted lineage is invalid.");
  }

  // Check if the submitted lineage has fewer steps than the InfiniBrowser lineage
  const infinibrowserStepsCount = infinibrowserLineage.data.steps.length;
  if (submittedStepsCount >= infinibrowserStepsCount) {
    const error_message = `Submitted lineage must have fewer steps than the InfiniBrowser lineage (${infinibrowserStepsCount} steps)`;
    return makeResponse(400, error_message);
  }

  const [submittedLineages, verifiedLineages] = await Promise.all([
    fetchLineageList("submitted", resultItemId, env),
    fetchLineageList("verified", resultItemId, env),
  ]);
  const existingLineages = [...submittedLineages, ...verifiedLineages];

  const lineageExists = existingLineages.some(
    (existingLineage) => existingLineage.lineageId === submittedLineageId,
  );

  if (lineageExists) {
    return makeResponse(400, "Submitted lineage already exists");
  }

  if (existingLineages.length <= 0) {
    // Something went wrong
  }

  // Check if submitted lineage is better than the existing lineages
  const bestExistingSteps = Math.min(...existingLineages.map((l) => l.steps));
  if (submittedStepsCount > bestExistingSteps) {
    const error_message = `Submitted lineage must have fewer steps than or equal to the best submitted lineage (${bestExistingSteps} steps)`;
    return makeResponse(400, error_message);
  }

  // Verify Lineage
  const { valid_order, invalid_element, invalid_step } =
    validateLineageCraftingOrder(submittedLineage.data);

  if (!valid_order) {
    const error_description = `element ${JSON.stringify(
      invalid_element,
    )} was used on step ${invalid_step} before being made`;
    const error_message = `Lineage is invalid (${error_description})`;
    return makeResponse(400, error_message);
  }

  // Reject if lineage has unused elements - PROBABLY TEMPORARY
  const resultElements = submittedLineage.data.steps
    .slice(0, -1)
    .map((step) => step.result.id);
  const usedIngredients = new Set(
    submittedLineage.data.steps.flatMap((step) => [step.a.id, step.b.id]),
  );
  const unusedResults = resultElements.filter(
    (res) => !usedIngredients.has(res),
  );
  if (unusedResults.length > 0) {
    const error_message = `Submitted lineage has unused elements: ${JSON.stringify(
      unusedResults,
    )}`;
    return makeResponse(400, error_message);
  }

  // Fetch existing submissions from Gitlab
  const { data, error: getGitlabFileDataError } = await tryCatch(
    getGitlabFileData("submitted", env),
  );

  if (getGitlabFileDataError) {
    return makeResponse(500, getGitlabFileDataError.message);
  }

  // Update lineages and submit to Gitlab
  const newLineage = {
    steps: submittedLineageData.stepCount,
    lineageId: submittedLineageId,
  };
  const updatedLineages = [...submittedLineages, newLineage];
  const encodedResultItemId = UriEncodeString(resultItemId);
  data[encodedResultItemId] = updatedLineages;

  // Submit lineage to Gitlab
  const commitMessage = `Added ${submittedStepsCount}-step lineage for ${resultItemId}`;
  const { error: saveToCloudError } = await tryCatch(
    saveToCloud(data, commitMessage, env),
  );

  if (saveToCloudError) {
    return makeResponse(500, saveToCloudError.message);
  }

  return makeResponse(200, "Lineage submitted successfully!");
}
