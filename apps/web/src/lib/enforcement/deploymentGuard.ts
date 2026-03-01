let isDeploying = false;

export async function guardedDeploy<T>(operation: () => Promise<T>): Promise<T> {
  if (isDeploying) {
    throw new Error("Deployment already in progress.");
  }

  isDeploying = true;
  try {
    return await operation();
  } finally {
    isDeploying = false;
  }
}

