import { Edit, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Farm } from "@/types/farm";
import { formatDateTime } from "@/utils/format";

interface FarmTableProps {
  farms: Farm[];
  isSaving: boolean;
  onEdit?: (farm: Farm) => void;
  onDelete?: (farm: Farm) => void;
}

export function FarmTable({ farms, isSaving, onEdit, onDelete }: FarmTableProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {farms.map((farm) => (
          <article key={farm.id} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/20">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">{farm.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{farm.description || "No description provided."}</p>
              </div>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Location: </span>
                  <span>{farm.location || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created: </span>
                  <span>{formatDateTime(farm.createdAt)}</span>
                </div>
                {farm.googleMapsUrl ? (
                  <a
                    className="inline-flex w-fit items-center gap-1 text-primary hover:underline"
                    href={farm.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open map
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <Badge className="w-fit">No map link</Badge>
                )}
              </div>
              {onEdit && onDelete ? <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(farm)} disabled={isSaving}>
                  <Edit className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(farm)} disabled={isSaving}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              </div> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Created</TableHead>
              {onEdit && onDelete ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {farms.map((farm) => (
              <TableRow key={farm.id} className="hover:bg-accent/30">
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{farm.name}</p>
                    {farm.description ? (
                      <p className="max-w-xl text-sm text-muted-foreground">{farm.description}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <span>{farm.location || "Not specified"}</span>
                    {farm.googleMapsUrl ? (
                      <a
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        href={farm.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open map
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <Badge className="w-fit">No map link</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(farm.createdAt)}</TableCell>
                {onEdit && onDelete ? <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(farm)} disabled={isSaving}>
                      <Edit className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(farm)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
