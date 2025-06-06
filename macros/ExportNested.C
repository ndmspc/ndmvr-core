#include <TFile.h>
#include <TBufferJSON.h>
#include <TSystem.h>
#include <TCanvas.h>
#include <TH1.h>
#include <TH2.h>
#include <TH3.h>
#include <TAxis.h>
#include <THnSparse.h>
#include <string>
#include <nlohmann/json.hpp>
using json = nlohmann::json;

void ExportNested(std::string filenameJson = "/tmp/test.json", std::vector<int> axes = {1, 2, 5},
                  std::string filename = "root://eos.ndmspc.io//eos/ndmspc/scratch/ndmspc/dev/alice/inputs/PWGLF-376/"
                                         "LHC22o_pass7_minBias_medium/0/346968/AnalysisResults.root",
                  std::string dir      = "phianalysis-t-hn-sparse_default/",
                  std::vector<std::string> objNames = {"unlikepm", "likepp", "likemm"})
{

  // const Int_t      rebin[] = {1, 100, 100, 1, 1, 17}; // Rebinning factors for each axis
  const Int_t rebin[] = {1, 10, 10, 1, 1, 1}; // Rebinning factors for each axis

  TH1::AddDirectory(kFALSE); // Prevent TH1 from changing the current directory

  TFile * file = TFile::Open(filename.c_str());
  if (!file || file->IsZombie()) {
    Printf("Error: File %s not found or is corrupted", filename.c_str());
    return;
  }

  std::map<std::string, TObject *> sparseObjects;

  for (auto key : objNames) {
    TObject * obj = file->Get(TString::Format("%s%s", dir.c_str(), key.c_str()));
    if (!obj) {
      Printf("Error: Object %s not found in file %s", key.c_str(), filename.c_str());
      file->Close();
      return;
    }
    if (obj && obj->InheritsFrom("THnSparse")) {
      Printf("Found THnSparse object: %s", key.c_str());
      THnSparse * hns = (THnSparse *)obj;
      hns->Print();
      hns                = hns->Rebin(rebin);
      sparseObjects[key] = hns;
    }
  }
  // loop over all axes and set the range
  for (auto & objName : objNames) {
    for (auto & ax : axes) {
      THnSparse * hns = (THnSparse *)sparseObjects[objName];
      if (ax < 0 || ax >= hns->GetNdimensions()) {
        Printf("Error: Axis %d is out of bounds for the histogram with %d dimensions", ax, hns->GetNdimensions());
        file->Close();
        return;
      }
      hns->GetAxis(ax)->SetRange(1, hns->GetAxis(ax)->GetNbins()); // Set range for each axis
    }
  }
  std::vector<TH1 *> hists1D;
  std::vector<TH2 *> hists2D;
  std::vector<TH3 *> hists3D;

  TH1 * h1 = nullptr;
  TH2 * h2 = nullptr;
  TH3 * h3 = nullptr;

  int         nCells = 0;
  int         i      = 0;
  THnSparse * hns    = (THnSparse *)sparseObjects[objNames[0]];

  if (axes.size() == 1) {
    h1 = hns->Projection(axes[0]);
    hists1D.push_back(h1);
    nCells = h1->GetNcells();
  }
  else if (axes.size() == 2) {
    h2     = hns->Projection(axes[1], axes[0]); // Project the histogram onto the specified axes
    nCells = h2->GetNcells();
  }
  else if (axes.size() == 3) {
    h3     = hns->Projection(axes[0], axes[1], axes[2]); // Project the histogram onto the specified axes
    nCells = h3->GetNcells();
  }
  else {
    Printf("Error: Invalid number of axes specified. Expected 1, 2, or 3, got %d", (int)axes.size());
    file->Close();
    return;
  }

  std::map<std::string, std::vector<TObject *>> sparseProjections;
  for (auto & key : objNames) {
    std::vector<TObject *> & v = sparseProjections[key];
    v.resize(nCells, nullptr); // Initialize the vector to hold the histograms
  }
  // Get a reference to the vector for "KeyC" (creates it if it doesn't exist)
  // std::vector<TObject *> hists(nCells, nullptr);  // Initialize a vector to hold the histograms
  // std::vector<TObject *> hists2(nCells, nullptr); // Initialize a vector to hold the histograms
  //
  std::vector<int> sizes;
  sizes.push_back(hns->GetAxis(axes[0])->GetNbins());
  axes.size() > 1 ? sizes.push_back(hns->GetAxis(axes[1])->GetNbins()) : sizes.push_back(1);
  (axes.size() > 2) ? sizes.push_back(hns->GetAxis(axes[2])->GetNbins()) : sizes.push_back(1);

  // TCanvas * c = new TCanvas("c", "Nested Histogram", 800, 600);
  // // loop over all bins in second axis
  for (auto & key : objNames) {
    THnSparse * hnsCurrent = (THnSparse *)sparseObjects[key];
    for (int k = 1; k <= sizes[2]; ++k) {
      if (h3) {
        hnsCurrent->GetAxis(axes[2])->SetRange(k, k);
      }
      for (int j = 1; j <= sizes[1]; ++j) {
        if (h2 || h3) {
          hnsCurrent->GetAxis(axes[1])->SetRange(j, j);
        }
        for (int i = 1; i <= sizes[0]; ++i) {

          Printf("Processing bin (%d, %d, %d) for %s", i, j, k, key.c_str());
          // if (i > 5) break; // Limit to first 5 bins for demonstration
          if (h1 || h2 || h3) {
            hnsCurrent->GetAxis(axes[0])->SetRange(i, i);
          }
          TH1 * im = hnsCurrent->Projection(0);
          if (!im) {
            continue;
          }
          // im->Draw();
          // gPad->Update();
          // gPad->Modified();
          // gSystem->ProcessEvents();
          int index = -1;
          if (h1) index = h1->FindFixBin(h1->GetXaxis()->GetBinCenter(i));
          if (h2) index = h2->FindFixBin(h2->GetXaxis()->GetBinCenter(i), h2->GetYaxis()->GetBinCenter(j));
          if (h3)
            index = h3->FindFixBin(h3->GetXaxis()->GetBinCenter(i), h3->GetYaxis()->GetBinCenter(j),
                                   h3->GetZaxis()->GetBinCenter(k));

          if (im->GetEntries() < 1000) {
            Printf("    Skipping bin (%d, %d, %d) with index %d due to low entries: %f", i, j, k, index,
                   im->GetEntries());
            if (h1) h1->SetBinContent(i, 0); // Set bin content to 0 if histogram is empty
            if (h2) h2->SetBinContent(i, j, 0);
            if (h3) h3->SetBinContent(i, j, k, 0);
            continue; // Skip bins with low entries
          }
          sparseProjections[key][index] = im; // Store the histogram in the vector at the correct index
          // hists2[index] = im2; // Store the histogram in the vector at the correct index
        }
      }
    }
  }

  if (h1) h1->Draw();
  if (h2) h2->Draw();
  if (h3) h3->Draw();

  // Printf("Exporting %d histograms", (int)hists.size());
  TString hJson;
  if (h1) hJson = TBufferJSON::ToJSON(h1);
  if (h2) hJson = TBufferJSON::ToJSON(h2);
  if (h3) hJson = TBufferJSON::ToJSON(h3);
  json hJsonParsed = json::parse(hJson.Data());

  for (auto objName : objNames) {
    json hJsonObj                    = json::parse(TBufferJSON::ToJSON(&sparseProjections[objName]).Data());
    hJsonParsed["children"][objName] = hJsonObj;
  }

  // TString objJson  = TBufferJSON::ToJSON(&hists);
  // TString objJson2 = TBufferJSON::ToJSON(&hists2);
  // // Printf("JSON: %s", objJson.Data());
  //
  // json arrJson                        = json::parse(objJson.Data());
  // hJsonParsed["children"]["unlikepm"] = arrJson;
  // json arrJson2                       = json::parse(objJson2.Data());
  // hJsonParsed["children"]["likemm"]   = arrJson2;
  //
  // // Printf("Parsed JSON: %s", h1JsonParsed.dump(2).c_str());
  std::string content = hJsonParsed.dump();
  // std::string filenameJson = "/tmp/test.json";
  TString filenameJsonStr = filenameJson.c_str();

  std::string postfix = "" + std::to_string((int)axes.size()) + "D.";
  for (auto & ax : axes) {
    // postfix += std::to_string(ax) + "_";
    postfix += hns->GetAxis(ax)->GetName();
    postfix += "_";
  }

  if (postfix.back() == '_') {
    postfix.pop_back(); // Remove trailing underscore
  }
  filenameJsonStr.ReplaceAll(".json", TString::Format("%s.json", postfix.c_str()).Data());
  TFile * fJson = TFile::Open(TString::Format("%s?filetype=raw", filenameJsonStr.Data()).Data(), "RECREATE");
  if (!fJson) return;

  fJson->WriteBuffer(content.c_str(), content.size());

  fJson->Close();
  Printf("Exported histograms to %s", filenameJsonStr.Data());

  filenameJsonStr.ReplaceAll(".json", ".root");
  TFile * fOut = TFile::Open(filenameJsonStr.Data(), "RECREATE");
  if (!fOut) {
    Printf("Error: Could not create output file %s", filenameJsonStr.Data());
    return;
  }

  if (h1) h1->Write("hMap");
  if (h2) h2->Write("hMap");
  if (h3) h3->Write("hMap");

  TDirectory * oDir = fOut->mkdir("content");
  oDir->cd();

  for (auto objName : objNames) {
    // loop over sparseProjections and write each histogram
    for (int i = 0; i < sparseProjections[objName].size(); ++i) {
      if (sparseProjections[objName][i]) {

        TString strPath = TString::Format("%d", i);
        oDir->mkdir(strPath.Data(), "", kTRUE);
        TDirectory * currentBinDir = oDir->GetDirectory(strPath.Data());
        currentBinDir->cd();
        sparseProjections[objName][i]->Write(TString::Format("%s", objName.c_str()).Data());
      }
    }
  }

  fOut->Close();
  Printf("Exported histograms to %s", filenameJsonStr.Data());

  file->Close();
}
