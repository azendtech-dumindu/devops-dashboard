"use client";

import {
    Card,
    Title,
    Text,
    Grid,
    Badge,
    List,
    ListItem,
} from "@tremor/react";
import { radarData, RadarBlip } from "@/lib/data/radar";

const quadrants = ["Techniques", "Tools", "Platforms", "Languages & Frameworks"];

const ringColors: Record<string, "emerald" | "blue" | "yellow" | "rose"> = {
    Adopt: "emerald",
    Trial: "blue",
    Assess: "yellow",
    Hold: "rose",
};

export default function RadarPage() {
    return (
        <main>
            <Title>Technology Radar</Title>
            <Text>Current and future technology landscape</Text>

            <Grid numItemsMd={2} className="mt-6 gap-6">
                {quadrants.map((quadrant) => {
                    const items = radarData.filter((item) => item.quadrant === quadrant);
                    return (
                        <Card key={quadrant} className="h-full">
                            <Title>{quadrant}</Title>
                            <List className="mt-4">
                                {items.map((item) => (
                                    <ListItem key={item.name}>
                                        <div className="truncate">
                                            <Text className="font-medium truncate">{item.name}</Text>
                                            <Text className="truncate text-xs">{item.description}</Text>
                                        </div>
                                        <Badge color={ringColors[item.ring]}>{item.ring}</Badge>
                                    </ListItem>
                                ))}
                            </List>
                        </Card>
                    );
                })}
            </Grid>
        </main>
    );
}
