import { registerFieldRenderer } from "../../../lib/forms/fieldRegistry";
import { DirPickerField } from "./DirPickerField";
import { UrlActionField } from "./UrlActionField";
import { ChipSelectField } from "./ChipSelectField";
import { SeedPackField } from "./SeedPackField";
import { ThemePickerField } from "./ThemePickerField";

registerFieldRenderer("dir-picker", DirPickerField);
registerFieldRenderer("url-action", UrlActionField);
registerFieldRenderer("chip-select", ChipSelectField);
registerFieldRenderer("seed-packs", SeedPackField);
registerFieldRenderer("theme-picker", ThemePickerField);
