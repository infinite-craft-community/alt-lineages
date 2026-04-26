import { Gitlab } from "@gitbeaker/rest";

import {
  type UriDecodedString,
  type UriEncodedString,
  UriEncodeString,
} from "#lib/typed-strings";

const GITLAB_PROJECT_ID = "66105097";

interface GitlabLineageEntry {
  steps: number;
  lineageId: string;
}

interface GitlabLineagesFileData {
  [key: UriEncodedString]: GitlabLineageEntry[];
}

export async function getGitlabFileData(
  type: "verified" | "submitted",
  env: Env,
): Promise<GitlabLineagesFileData> {
  const filePath = `lineages/${type}.json`;
  const api = new Gitlab({ token: env.GITLAB_ACCESS_TOKEN });

  const file = await api.RepositoryFiles.showRaw(
    GITLAB_PROJECT_ID,
    filePath,
    "main",
  );

  const data = JSON.parse(file as string) as GitlabLineagesFileData;
  return data;
}

export async function fetchLineageList(
  type: "verified" | "submitted" | "all",
  itemId: UriDecodedString,
  env: Env,
): Promise<GitlabLineageEntry[]> {
  const encodedItemId = UriEncodeString(itemId);

  if (type === "all") {
    const [verifiedData, submittedData] = await Promise.all([
      getGitlabFileData("verified", env),
      getGitlabFileData("submitted", env),
    ]);

    const verifiedList = verifiedData[encodedItemId] ?? [];
    const submittedList = submittedData[encodedItemId] ?? [];

    return [...verifiedList, ...submittedList];
  }

  const data = await getGitlabFileData(type, env);
  return data[encodedItemId] ?? [];
}

export async function saveToCloud(
  data: GitlabLineagesFileData,
  commitMessage: string,
  env: Env,
) {
  const filePath = "lineages/submitted.json";
  const newContent = JSON.stringify(data, null, 4);

  const api = new Gitlab({ token: env.GITLAB_ACCESS_TOKEN });

  return api.Commits.create(GITLAB_PROJECT_ID, "main", commitMessage, [
    { action: "update", filePath: filePath, content: newContent },
  ]);
}
