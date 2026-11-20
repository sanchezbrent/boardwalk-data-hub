import { test,expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("save, preview and independent review with accessible controls",async({page})=>{
 await page.goto("/");await expect(page.getByRole("status")).toHaveText("Private editor ready.");
 await page.getByRole("button",{name:"Preview current input"}).click();await expect(page.getByRole("table")).toBeVisible();
 await page.getByRole("button",{name:"Save private draft"}).click();await expect(page.getByRole("status")).toHaveText("Revision 1: draft.");
 await page.getByRole("button",{name:"Request validation"}).click();await expect(page.getByRole("status")).toHaveText("Revision 2: review.");
 await page.getByLabel("Simulated staff role").selectOption("validator");await page.getByLabel("Independent review evidence").fill("Checked original source and recomputed all four values.");
 await page.getByRole("button",{name:"Record independent validation"}).click();await expect(page.getByRole("status")).toHaveText("Revision 3: validated.");
 await page.getByLabel("Simulated staff role").selectOption("approver");await page.getByLabel("Independent review evidence").fill("Approved the exact source vintage and digest.");
 await page.getByRole("button",{name:"Approve exact revision"}).click();await expect(page.getByRole("status")).toHaveText("Revision 4: approved.");
 await expect(page.getByText("Approved for the pilot review record. Public publication is not enabled.")).toBeVisible();
 await page.getByRole("button",{name:"Preview current input"}).click();
 const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(results.violations).toEqual([]);
 await expect(page.getByRole("status")).toBeFocused();
});
test("invalid input is announced and read-only staff cannot save",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/");
 await page.getByLabel("Accessible chart description").fill("<script>alert(1)</script>");
 await page.getByRole("button",{name:"Save private draft"}).click();await expect(page.getByRole("status")).toContainText("bounded plain text");
 await expect(page.getByRole("status")).toBeFocused();
 await page.getByLabel("Simulated staff role").selectOption("viewer");await expect(page.getByRole("button",{name:"Save private draft"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Request validation"})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(results.violations).toEqual([]);
});
