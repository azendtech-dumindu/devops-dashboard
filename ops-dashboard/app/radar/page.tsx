"use client";

import {
    Card,
    Badge,
    List,
    ListItem,
} from "@tremor/react";
import { radarData } from "@/lib/data/radar";

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
            <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Technology Radar</h1>
            <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">Current and future technology landscape</p>

            <div className="grid grid-cols-1 md:grid-cols-2 mt-6 gap-6">
                {quadrants.map((quadrant) => {
                    const items = radarData.filter((item) => item.quadrant === quadrant);
                    return (
                        <Card key={quadrant} className="h-full">
                            <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">{quadrant}</h3>
                            <List className="mt-4">
                                {items.map((item) => (
                                    <ListItem key={item.name}>
                                        <div className="truncate">
                                            <span className="font-medium text-tremor-content-strong truncate">{item.name}</span>
                                            <p className="truncate text-xs text-tremor-content">{item.description}</p>
                                        </div>
                                        <Badge color={ringColors[item.ring]}>{item.ring}</Badge>
                                    </ListItem>
                                ))}
                            </List>
                        </Card>
                    );
                })}
            </div>
        </main>
    );
}
