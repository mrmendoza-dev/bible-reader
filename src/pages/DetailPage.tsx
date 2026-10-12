import { useParams } from "react-router-dom";

export const DetailPage = () => {
  const { id } = useParams();

  return (
    <div className="flex flex-col gap-2" data-testid="detail-page">
      <h1 className="text-lg font-semibold">Detail</h1>
      <p className="text-sm text-muted-foreground">
        Resource ID:{" "}
        <span className="font-mono text-foreground">{id ?? "—"}</span>
      </p>
    </div>
  );
};
