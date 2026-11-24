import React from "react";
import { Link } from "react-router-dom";

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="container">
      <section className="panel">
        <h1 className="section-heading">{title}</h1>
        <p className="muted">{description}</p>
        <div style={{ marginTop: 14 }}>
          <Link to="/" className="muted">
            ← Return to Home
          </Link>
        </div>
      </section>
    </div>
  );
}