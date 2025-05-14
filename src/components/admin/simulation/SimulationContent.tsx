
import { useState, useEffect } from "react";
import { SimulationSummary } from "./SimulationSummary";
import { SimulationFilters } from "./SimulationFilters";
import { SimulationTable } from "./SimulationTable";
import { EmptySimulations } from "./EmptySimulations";
import { TaxSimulation } from "@/types/taxSimulation";

interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

interface SimulationContentProps {
  filteredSimulations: TaxSimulation[];
  searchTerm: string;
  timeFilter: string;
  typeFilter: string;
  sortConfig: {key: string, direction: string};
  userDetails: UserDetails;
  onSearchChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onRequestSort: (key: string) => void;
  onViewDetails: (simulation: TaxSimulation) => void;
  onGeneratePDF: (simulation: TaxSimulation) => void;
  onOpenObservations: (simulation: TaxSimulation) => void;
}

export const SimulationContent = ({
  filteredSimulations,
  searchTerm,
  timeFilter,
  typeFilter,
  sortConfig,
  userDetails,
  onSearchChange,
  onTimeFilterChange,
  onTypeFilterChange,
  onRequestSort,
  onViewDetails,
  onGeneratePDF,
  onOpenObservations
}: SimulationContentProps) => {
  return (
    <div className="space-y-6">
      <SimulationFilters 
        searchTerm={searchTerm}
        timeFilter={timeFilter}
        typeFilter={typeFilter}
        onSearchChange={onSearchChange}
        onTimeFilterChange={onTimeFilterChange}
        onTypeFilterChange={onTypeFilterChange}
      />
      
      {filteredSimulations.length === 0 ? (
        <EmptySimulations 
          searchTerm={searchTerm} 
          timeFilter={timeFilter} 
          typeFilter={typeFilter} 
        />
      ) : (
        <div className="space-y-6">
          <SimulationSummary filteredSimulations={filteredSimulations} />
          <SimulationTable 
            filteredSimulations={filteredSimulations} 
            userDetails={userDetails} 
            sortConfig={sortConfig} 
            onRequestSort={onRequestSort} 
            onViewDetails={onViewDetails} 
            onGeneratePDF={onGeneratePDF} 
            onOpenObservations={onOpenObservations} 
          />
        </div>
      )}
    </div>
  );
};
