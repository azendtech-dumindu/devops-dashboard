export type RadarBlip = {
    name: string;
    quadrant: "Techniques" | "Tools" | "Platforms" | "Languages & Frameworks";
    ring: "Adopt" | "Trial" | "Assess" | "Hold";
    description: string;
};

export const radarData: RadarBlip[] = [
    // Adopt
    { name: "Next.js", quadrant: "Languages & Frameworks", ring: "Adopt", description: "Standard for new web apps" },
    { name: "Azure Kubernetes Service", quadrant: "Platforms", ring: "Adopt", description: "Default container orchestration" },
    { name: "Terraform", quadrant: "Tools", ring: "Adopt", description: "IaC standard" },
    { name: "CI/CD Pipelines", quadrant: "Techniques", ring: "Adopt", description: "GitHub Actions for all repos" },

    // Trial
    { name: "Bun", quadrant: "Languages & Frameworks", ring: "Trial", description: "Faster runtime for internal tools" },
    { name: "Bicep", quadrant: "Tools", ring: "Trial", description: "Azure-native IaC alternative" },
    { name: "Service Mesh (Istio)", quadrant: "Platforms", ring: "Trial", description: "Managing microservices traffic" },

    // Assess
    { name: "GraphQL", quadrant: "Languages & Frameworks", ring: "Assess", description: "Considering for unified data layer" },
    { name: "AI-Assisted Coding", quadrant: "Techniques", ring: "Assess", description: "Copilot / Ghostwriter productivity" },

    // Hold
    { name: "Jenkins", quadrant: "Tools", ring: "Hold", description: "Moving to GitHub Actions" },
    { name: "AngularJS", quadrant: "Languages & Frameworks", ring: "Hold", description: "Legacy, do not use for new" },
];
